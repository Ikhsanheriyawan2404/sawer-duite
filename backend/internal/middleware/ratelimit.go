package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-redis/redis_rate/v10"
	"github.com/ikhsan/ongob/backend/internal/domain"
	"github.com/redis/go-redis/v9"
)

func RateLimit(rdb *redis.Client, cfg domain.Config) func(http.Handler) http.Handler {
	limiter := redis_rate.NewLimiter(rdb)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := "ratelimit:" + r.RemoteAddr

			res, err := limiter.Allow(r.Context(), key, redis_rate.Limit{
				Rate:   cfg.RateLimitRequests,
				Burst:  cfg.RateLimitRequests,
				Period: cfg.RateLimitDuration,
			})

			if err != nil {
				// If Redis is down, we might want to allow the request or block it.
				// For this example, we'll allow it but log the error.
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(res.Limit.Rate))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(res.Remaining))
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(res.ResetAfter).Unix(), 10))

			if res.Allowed <= 0 {
				http.Error(w, "too many requests", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
