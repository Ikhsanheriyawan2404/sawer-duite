package domain

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// AlertQueueItem represents a single alert in the queue
// Stored as JSON in Redis list per user
// Payload already includes alert_id

type AlertQueueManager struct {
	rdb        *redis.Client
	ackTimeout time.Duration
	lockTTL    time.Duration
}

// ClientMessage represents incoming message from client
// NOTE: keep in sync with WS payload from frontend

type ClientMessage struct {
	Type    string `json:"type"`    // "ack"
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
	return "queue:" + userUUID
}

func (m *AlertQueueManager) playingKey(userUUID string) string {
	return "queue:" + userUUID + ":playing"
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

func generateAlertID() string {
	return uuid.New().String()
}

func (m *AlertQueueManager) Enqueue(alert AlertMessage) {
	ctx := context.Background()
	alertID := generateAlertID()

	payload := struct {
		AlertMessage
		AlertID string `json:"alert_id"`
	}{
		AlertMessage: alert,
		AlertID:      alertID,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[Queue] Error marshaling alert: %v", err)
		return
	}

	if err := m.rdb.RPush(ctx, m.queueKey(alert.UserUUID), data).Err(); err != nil {
		log.Printf("[Queue] Failed to enqueue alert: %v", err)
		return
	}

	// Try to send immediately
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

	playing, err := m.rdb.Get(ctx, m.playingKey(userUUID)).Result()
	if err == nil && playing != "" {
		return
	}
	if err != nil && err != redis.Nil {
		log.Printf("[Queue] Failed to read playing key: %v", err)
		return
	}

	data, err := m.rdb.LPop(ctx, m.queueKey(userUUID)).Bytes()
	if err == redis.Nil {
		return
	}
	if err != nil {
		log.Printf("[Queue] Failed to pop queue: %v", err)
		return
	}

	var parsed struct {
		AlertID string `json:"alert_id"`
	}
	if err := json.Unmarshal(data, &parsed); err != nil || parsed.AlertID == "" {
		log.Printf("[Queue] Invalid alert payload: %v", err)
		return
	}

	if err := m.rdb.Set(ctx, m.playingKey(userUUID), parsed.AlertID, m.ackTimeout+5*time.Second).Err(); err != nil {
		log.Printf("[Queue] Failed to set playing key: %v", err)
		return
	}

	deadline := time.Now().Add(m.ackTimeout).Unix()
	if err := m.rdb.ZAdd(ctx, m.inflightKey(), redis.Z{Score: float64(deadline), Member: m.inflightMember(userUUID, parsed.AlertID)}).Err(); err != nil {
		log.Printf("[Queue] Failed to add inflight: %v", err)
		return
	}

	if err := m.PublishRaw(userUUID, data); err != nil {
		log.Printf("[Queue] Failed to publish alert: %v", err)
	}
}

func (m *AlertQueueManager) HandleACK(userUUID string, alertID string) {
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
	if err != nil {
		log.Printf("[Queue] Failed to read playing key: %v", err)
		return
	}
	if playing != alertID {
		log.Printf("[Queue] ACK mismatch: expected %s, got %s", playing, alertID)
		return
	}

	if err := m.rdb.Del(ctx, m.playingKey(userUUID)).Err(); err != nil {
		log.Printf("[Queue] Failed to clear playing: %v", err)
	}
	if err := m.rdb.ZRem(ctx, m.inflightKey(), m.inflightMember(userUUID, alertID)).Err(); err != nil {
		log.Printf("[Queue] Failed to remove inflight: %v", err)
	}

	m.SendNext(userUUID)
}

func (m *AlertQueueManager) GetQueueStatus(userUUID string) (int, bool) {
	ctx := context.Background()
	lenRes, err := m.rdb.LLen(ctx, m.queueKey(userUUID)).Result()
	if err != nil {
		return 0, false
	}
	playing, err := m.rdb.Get(ctx, m.playingKey(userUUID)).Result()
	if err == redis.Nil || playing == "" {
		return int(lenRes), false
	}
	if err != nil {
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
