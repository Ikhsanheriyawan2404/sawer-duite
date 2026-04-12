package domain

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type AlertQueueManager struct {
	rdb        *redis.Client
	ackTimeout time.Duration
	lockTTL    time.Duration
}

type ClientMessage struct {
	Type    string `json:"type"` // "FINISHED", "LISTENER_READY"
	AlertID string `json:"alert_id"`
}

func NewAlertQueueManager(rdb *redis.Client) *AlertQueueManager {
	return &AlertQueueManager{
		rdb:        rdb,
		ackTimeout: 60 * time.Second,
		lockTTL:    5 * time.Second,
	}
}

func (m *AlertQueueManager) queueKey(userUUID string) string {
	return "stream:queue:" + userUUID
}

func (m *AlertQueueManager) playingKey(userUUID string) string {
	return "queue:" + userUUID + ":playing"
}

func (m *AlertQueueManager) listenerKey(userUUID string) string {
	return "queue:" + userUUID + ":listener_active"
}

func (m *AlertQueueManager) lockKey(userUUID string) string {
	return "queue:" + userUUID + ":lock"
}

func (m *AlertQueueManager) inflightKey() string {
	return "queue:inflight"
}

func (m *AlertQueueManager) channelKey(userUUID string) string {
	return "ws:" + userUUID
}

func (m *AlertQueueManager) inflightMember(userUUID, alertID string) string {
	return userUUID + ":" + alertID
}

func (m *AlertQueueManager) SetListenerActive(userUUID string) {
	ctx := context.Background()
	// Set active status with 30s TTL
	m.rdb.Set(ctx, m.listenerKey(userUUID), "1", 30*time.Second)
}

func (m *AlertQueueManager) isListenerActive(userUUID string) bool {
	ctx := context.Background()
	val, err := m.rdb.Get(ctx, m.listenerKey(userUUID)).Result()
	return err == nil && val == "1"
}

func (m *AlertQueueManager) PublishRaw(userUUID string, payload []byte) error {
	ctx := context.Background()
	return m.rdb.Publish(ctx, m.channelKey(userUUID), payload).Err()
}

func (m *AlertQueueManager) PublishAlertMessage(alert AlertMessage) error {
	data, err := json.Marshal(alert)
	if err != nil {
		return err
	}
	return m.PublishRaw(alert.UserUUID, data)
}

func (m *AlertQueueManager) Enqueue(alert AlertMessage) {
	ctx := context.Background()

	data, err := json.Marshal(alert)
	if err != nil {
		log.Printf("[Queue] Error marshaling alert: %v", err)
		return
	}

	if err := m.rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: m.queueKey(alert.UserUUID),
		Values: map[string]interface{}{"payload": data},
	}).Err(); err != nil {
		log.Printf("[Queue] Failed to enqueue alert to stream: %v", err)
		return
	}

	m.SendNext(alert.UserUUID)
}

func (m *AlertQueueManager) SendNext(userUUID string) {
	ctx := context.Background()
	lockVal := uuid.New().String()

	ok, err := m.rdb.SetNX(ctx, m.lockKey(userUUID), lockVal, m.lockTTL).Result()
	if err != nil || !ok {
		return
	}
	defer m.releaseLock(ctx, userUUID, lockVal)

	m.sendNextNoLock(ctx, userUUID)
}

func (m *AlertQueueManager) sendNextNoLock(ctx context.Context, userUUID string) {
	// CRITICAL: Only send if a listener is actually active
	if !m.isListenerActive(userUUID) {
		return
	}

	playing, err := m.rdb.Get(ctx, m.playingKey(userUUID)).Result()
	if err == nil && playing != "" {
		return
	}

	msgs, err := m.rdb.XRangeN(ctx, m.queueKey(userUUID), "-", "+", 1).Result()
	if err != nil || len(msgs) == 0 {
		return
	}

	msgID := msgs[0].ID
	payloadStr, ok := msgs[0].Values["payload"].(string)
	if !ok {
		return
	}

	var alert AlertMessage
	if err := json.Unmarshal([]byte(payloadStr), &alert); err != nil {
		log.Printf("[Queue] Invalid alert payload in stream: %v", err)
		return
	}

	payload := struct {
		AlertMessage
		AlertID string `json:"alert_id"`
	}{
		AlertMessage: alert,
		AlertID:      msgID,
	}

	dataToSend, err := json.Marshal(payload)
	if err != nil {
		return
	}

	if err := m.rdb.Set(ctx, m.playingKey(userUUID), msgID, m.ackTimeout+5*time.Second).Err(); err != nil {
		log.Printf("[Queue] Failed to set playing key: %v", err)
		return
	}

	deadline := time.Now().Add(m.ackTimeout).Unix()
	if err := m.rdb.ZAdd(ctx, m.inflightKey(), redis.Z{Score: float64(deadline), Member: m.inflightMember(userUUID, msgID)}).Err(); err != nil {
		log.Printf("[Queue] Failed to add inflight: %v", err)
		return
	}

	if err := m.PublishRaw(userUUID, dataToSend); err != nil {
		log.Printf("[Queue] Failed to publish alert: %v", err)
	}
}

func (m *AlertQueueManager) HandleFinished(userUUID string, alertID string) {
	ctx := context.Background()
	lockVal := uuid.New().String()

	ok, err := m.rdb.SetNX(ctx, m.lockKey(userUUID), lockVal, m.lockTTL).Result()
	if err != nil || !ok {
		return
	}
	defer m.releaseLock(ctx, userUUID, lockVal)

	playing, err := m.rdb.Get(ctx, m.playingKey(userUUID)).Result()
	if err == redis.Nil || playing == "" {
		return
	}
	if playing != alertID {
		log.Printf("[Queue] FINISHED mismatch: expected %s, got %s", playing, alertID)
		return
	}

	// Remove from stream now that it is successfully shown
	if err := m.rdb.XDel(ctx, m.queueKey(userUUID), alertID).Err(); err != nil {
		log.Printf("[Queue] Failed to delete from stream: %v", err)
	}

	if err := m.rdb.Del(ctx, m.playingKey(userUUID)).Err(); err != nil {
		log.Printf("[Queue] Failed to clear playing: %v", err)
	}
	if err := m.rdb.ZRem(ctx, m.inflightKey(), m.inflightMember(userUUID, alertID)).Err(); err != nil {
		log.Printf("[Queue] Failed to remove inflight: %v", err)
	}

	m.sendNextNoLock(ctx, userUUID)
}

func (m *AlertQueueManager) GetQueueStatus(userUUID string) (int, bool) {
	ctx := context.Background()
	lenRes, err := m.rdb.XLen(ctx, m.queueKey(userUUID)).Result()
	if err != nil {
		return 0, false
	}
	playing, err := m.rdb.Get(ctx, m.playingKey(userUUID)).Result()
	if err == redis.Nil || playing == "" {
		return int(lenRes), false
	}
	return int(lenRes), true
}

func (m *AlertQueueManager) RunTimeoutWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.reapExpired(ctx)
		}
	}
}

func (m *AlertQueueManager) reapExpired(ctx context.Context) {
	now := time.Now().Unix()
	for {
		members, err := m.rdb.ZRangeByScore(ctx, m.inflightKey(), &redis.ZRangeBy{Min: "-inf", Max: fmtInt64(now), Offset: 0, Count: 100}).Result()
		if err != nil || len(members) == 0 {
			return
		}

		for _, member := range members {
			parts := strings.SplitN(member, ":", 2)
			if len(parts) != 2 {
				_ = m.rdb.ZRem(ctx, m.inflightKey(), member).Err()
				continue
			}
			userUUID := parts[0]
			alertID := parts[1]

			lockVal := uuid.New().String()
			ok, err := m.rdb.SetNX(ctx, m.lockKey(userUUID), lockVal, m.lockTTL).Result()
			if err != nil || !ok {
				continue
			}

			playing, err := m.rdb.Get(ctx, m.playingKey(userUUID)).Result()
			if err == nil && playing == alertID {
				// Safety Timeout hit!
				if m.isListenerActive(userUUID) {
					// Case A: Listener is ONLINE but not responding (frozen).
					// We XDEL to skip this broken alert and move on.
					_ = m.rdb.XDel(ctx, m.queueKey(userUUID), alertID).Err()
					log.Printf("[Queue] Alert %s timed out (Listener Frozen) - Skipping", alertID)
				} else {
					// Case B: User is truly OFFLINE.
					// We DO NOT XDEL. We just clear status so it can be re-sent when they return.
					log.Printf("[Queue] Alert %s timed out (User Offline) - Preserving for later", alertID)
				}

				_ = m.rdb.Del(ctx, m.playingKey(userUUID)).Err()
				_ = m.rdb.ZRem(ctx, m.inflightKey(), member).Err()
				m.releaseLock(ctx, userUUID, lockVal)
				m.SendNext(userUUID)
				continue
			}
			_ = m.rdb.ZRem(ctx, m.inflightKey(), member).Err()
			m.releaseLock(ctx, userUUID, lockVal)
		}
	}
}

func (m *AlertQueueManager) releaseLock(ctx context.Context, userUUID, lockVal string) {
	lua := redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
	return redis.call("DEL", KEYS[1])
else
	return 0
end
`)
	_, _ = lua.Run(ctx, m.rdb, []string{m.lockKey(userUUID)}, lockVal).Result()
}

func fmtInt64(v int64) string {
	return strconv.FormatInt(v, 10)
}
