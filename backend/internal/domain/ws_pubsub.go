package domain

import (
	"context"
	"strings"

	"github.com/redis/go-redis/v9"
)

// RunRedisSubscriber listens to ws:* channel and forwards payload to local clients
func (h *Hub) RunRedisSubscriber(ctx context.Context, rdb *redis.Client) {
	pubsub := rdb.PSubscribe(ctx, "ws:*")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			userUUID := strings.TrimPrefix(msg.Channel, "ws:")
			if userUUID == "" {
				continue
			}
			h.BroadcastRaw <- RawMessage{UserUUID: userUUID, Payload: []byte(msg.Payload)}
		}
	}
}
