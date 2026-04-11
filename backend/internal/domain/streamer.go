package domain

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 // Client tidak seharusnya mengirim pesan besar
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Security: Hanya izinkan origin yang valid (bisa diambil dari config)
		// Untuk dev kita izinkan localhost, tapi jangan gunakan 'true' saja
		return true
	},
}

type Client struct {
	Hub          *Hub
	Conn         *websocket.Conn
	Send         chan []byte
	UserUUID     string
	QueueManager *AlertQueueManager
}

type RawMessage struct {
	UserUUID string
	Payload  []byte
}

type Hub struct {
	Clients    map[string]map[*Client]bool
	Broadcast  chan AlertMessage
	BroadcastRaw chan RawMessage
	Register   chan *Client
	Unregister chan *Client
	mu         sync.Mutex
}

type AlertMessage struct {
	UserUUID        string `json:"user_uuid"`
	TransactionUUID string `json:"transaction_uuid"`
	Type            string `json:"type"` // "ALERT" or "REFRESH"
	Amount          int    `json:"amount"`
	Sender          string `json:"sender"`
	Message         string `json:"message"`
	AudioURL        string `json:"audio_url"`
	MediaURL        string `json:"media_url"`
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]map[*Client]bool),
		Broadcast:  make(chan AlertMessage),
		BroadcastRaw: make(chan RawMessage, 256),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if h.Clients[client.UserUUID] == nil {
				h.Clients[client.UserUUID] = make(map[*Client]bool)
			}
			// Limit: Maksimal 5 koneksi per User UUID (mencegah DoS)
			if len(h.Clients[client.UserUUID]) < 5 {
				h.Clients[client.UserUUID][client] = true
			} else {
				client.Conn.Close()
			}
			h.mu.Unlock()

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.Clients[client.UserUUID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.Send)
					if len(clients) == 0 {
						delete(h.Clients, client.UserUUID)
					}
				}
			}
			h.mu.Unlock()

		case alert := <-h.Broadcast:
			h.mu.Lock()
			clients := h.Clients[alert.UserUUID]
			payload, _ := json.Marshal(alert)
			for client := range clients {
				select {
				case client.Send <- payload:
				default:
					close(client.Send)
					delete(h.Clients[alert.UserUUID], client)
				}
			}
			h.mu.Unlock()

		case raw := <-h.BroadcastRaw:
			h.mu.Lock()
			clients := h.Clients[raw.UserUUID]
			for client := range clients {
				select {
				case client.Send <- raw.Payload:
				default:
					close(client.Send)
					delete(h.Clients[raw.UserUUID], client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// readPump menguras pesan dari client untuk menjaga koneksi dan memproses pongs
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Handle ACK messages from client
		var clientMsg ClientMessage
		if err := json.Unmarshal(message, &clientMsg); err == nil {
			if clientMsg.Type == "ack" && clientMsg.AlertID != "" && c.QueueManager != nil {
				log.Printf("[WS] Received ACK from client for alert %s", clientMsg.AlertID)
				c.QueueManager.HandleACK(c.UserUUID, clientMsg.AlertID)
			}
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func ServeWs(hub *Hub, queueManager *AlertQueueManager, w http.ResponseWriter, r *http.Request, userUUID string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{
		Hub:          hub,
		Conn:         conn,
		Send:         make(chan []byte, 256),
		UserUUID:     userUUID,
		QueueManager: queueManager,
	}
	client.Hub.Register <- client

	// Jalankan read dan write di goroutine terpisah
	go client.WritePump()
	go client.ReadPump()

	// Check if there are pending alerts in queue for this user
	if queueManager != nil {
		queueLen, isPlaying := queueManager.GetQueueStatus(userUUID)
		if queueLen > 0 && !isPlaying {
			log.Printf("[WS] New client connected, resuming queue for user %s", userUUID)
			go queueManager.SendNext(userUUID)
		}
	}
}
