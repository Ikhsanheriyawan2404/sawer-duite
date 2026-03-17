package domain

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Adjust for production
	},
}

type Client struct {
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	UserUUID string
}

type Hub struct {
	Clients    map[string]map[*Client]bool
	Broadcast  chan AlertMessage
	Register   chan *Client
	Unregister chan *Client
	mu         sync.Mutex
}

type AlertMessage struct {
	UserUUID string `json:"user_uuid"`
	Amount   int    `json:"amount"` // Base amount to show
	Sender   string `json:"sender"`
	Message  string `json:"message"`
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]map[*Client]bool),
		Broadcast:  make(chan AlertMessage),
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
			h.Clients[client.UserUUID][client] = true
			h.mu.Unlock()
			log.Printf("Client registered for user: %s", client.UserUUID)

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
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
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
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request, userUUID string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{Hub: hub, Conn: conn, Send: make(chan []byte, 256), UserUUID: userUUID}
	client.Hub.Register <- client

	go client.WritePump()
}
