package domain

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// AlertQueueItem represents a single alert in the queue
type AlertQueueItem struct {
	ID        string       `json:"id"`
	Alert     AlertMessage `json:"alert"`
	CreatedAt time.Time    `json:"created_at"`
}

// UserAlertQueue manages FIFO queue for a single user
type UserAlertQueue struct {
	UserUUID    string
	Queue       []AlertQueueItem
	IsPlaying   bool              // true if waiting for ACK
	CurrentID   string            // ID of currently playing alert
	mu          sync.Mutex
}

// AlertQueueManager manages all user queues
type AlertQueueManager struct {
	queues     map[string]*UserAlertQueue
	hub        *Hub
	mu         sync.RWMutex
	ackTimeout time.Duration
}

// ClientMessage represents incoming message from client
type ClientMessage struct {
	Type    string `json:"type"`    // "ack"
	AlertID string `json:"alert_id"`
}

// NewAlertQueueManager creates a new queue manager
func NewAlertQueueManager(hub *Hub) *AlertQueueManager {
	return &AlertQueueManager{
		queues:     make(map[string]*UserAlertQueue),
		hub:        hub,
		ackTimeout: 60 * time.Second, // Timeout if client doesn't ACK
	}
}

// getOrCreateQueue gets existing queue or creates new one for user
func (m *AlertQueueManager) getOrCreateQueue(userUUID string) *UserAlertQueue {
	m.mu.Lock()
	defer m.mu.Unlock()

	if q, exists := m.queues[userUUID]; exists {
		return q
	}

	q := &UserAlertQueue{
		UserUUID: userUUID,
		Queue:    make([]AlertQueueItem, 0),
	}
	m.queues[userUUID] = q
	return q
}

// generateAlertID creates unique ID for alert
func generateAlertID() string {
	return time.Now().Format("20060102150405.000000")
}

// Enqueue adds alert to user's queue
func (m *AlertQueueManager) Enqueue(alert AlertMessage) {
	q := m.getOrCreateQueue(alert.UserUUID)

	q.mu.Lock()
	item := AlertQueueItem{
		ID:        generateAlertID(),
		Alert:     alert,
		CreatedAt: time.Now(),
	}
	q.Queue = append(q.Queue, item)
	queueLen := len(q.Queue)
	isPlaying := q.IsPlaying
	q.mu.Unlock()

	log.Printf("[Queue] Alert enqueued for user %s, queue length: %d", alert.UserUUID, queueLen)

	// If not currently playing, send next alert
	if !isPlaying {
		m.sendNext(alert.UserUUID)
	}
}

// SendNext sends the next alert in queue to all user's clients (exported for ServeWs)
func (m *AlertQueueManager) SendNext(userUUID string) {
	m.sendNext(userUUID)
}

// sendNext sends the next alert in queue to all user's clients
func (m *AlertQueueManager) sendNext(userUUID string) {
	m.mu.RLock()
	q, exists := m.queues[userUUID]
	m.mu.RUnlock()

	if !exists {
		return
	}

	q.mu.Lock()
	if len(q.Queue) == 0 {
		q.IsPlaying = false
		q.CurrentID = ""
		q.mu.Unlock()
		log.Printf("[Queue] Queue empty for user %s", userUUID)
		return
	}

	// Get first item (FIFO)
	item := q.Queue[0]
	q.IsPlaying = true
	q.CurrentID = item.ID
	q.mu.Unlock()

	// Build message with alert ID
	payload := struct {
		AlertMessage
		AlertID string `json:"alert_id"`
	}{
		AlertMessage: item.Alert,
		AlertID:      item.ID,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[Queue] Error marshaling alert: %v", err)
		return
	}

	// Send to all clients of this user
	m.hub.mu.Lock()
	clients := m.hub.Clients[userUUID]
	sentCount := 0
	for client := range clients {
		select {
		case client.Send <- data:
			sentCount++
		default:
			// Client buffer full, skip
			log.Printf("[Queue] Client buffer full, skipping")
		}
	}
	m.hub.mu.Unlock()

	log.Printf("[Queue] Sent alert %s to %d clients for user %s", item.ID, sentCount, userUUID)

	// Start timeout timer
	go m.startACKTimeout(userUUID, item.ID)
}

// startACKTimeout handles timeout if client doesn't ACK
func (m *AlertQueueManager) startACKTimeout(userUUID string, alertID string) {
	time.Sleep(m.ackTimeout)

	m.mu.RLock()
	q, exists := m.queues[userUUID]
	m.mu.RUnlock()

	if !exists {
		return
	}

	q.mu.Lock()
	// Check if this alert is still current (not yet ACKed)
	if q.CurrentID == alertID && q.IsPlaying {
		log.Printf("[Queue] ACK timeout for alert %s, auto-advancing", alertID)
		// Remove from queue and send next
		if len(q.Queue) > 0 {
			q.Queue = q.Queue[1:]
		}
		q.IsPlaying = false
		q.CurrentID = ""
		q.mu.Unlock()
		m.sendNext(userUUID)
	} else {
		q.mu.Unlock()
	}
}

// HandleACK processes ACK from client
func (m *AlertQueueManager) HandleACK(userUUID string, alertID string) {
	m.mu.RLock()
	q, exists := m.queues[userUUID]
	m.mu.RUnlock()

	if !exists {
		log.Printf("[Queue] ACK received but no queue for user %s", userUUID)
		return
	}

	q.mu.Lock()
	// Verify this ACK is for current alert
	if q.CurrentID != alertID {
		log.Printf("[Queue] ACK mismatch: expected %s, got %s", q.CurrentID, alertID)
		q.mu.Unlock()
		return
	}

	// Remove from queue
	if len(q.Queue) > 0 {
		q.Queue = q.Queue[1:]
	}
	q.IsPlaying = false
	q.CurrentID = ""
	remainingLen := len(q.Queue)
	q.mu.Unlock()

	log.Printf("[Queue] ACK received for alert %s, remaining in queue: %d", alertID, remainingLen)

	// Send next alert
	m.sendNext(userUUID)
}

// GetQueueStatus returns queue status for a user
func (m *AlertQueueManager) GetQueueStatus(userUUID string) (int, bool) {
	m.mu.RLock()
	q, exists := m.queues[userUUID]
	m.mu.RUnlock()

	if !exists {
		return 0, false
	}

	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.Queue), q.IsPlaying
}
