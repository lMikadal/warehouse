package redis

// Client is a placeholder until Redis is wired (session/cache).
type Client struct{}

// New returns (nil, nil) when redisURL is empty.
func New(redisURL string) (*Client, error) {
	if redisURL == "" {
		return nil, nil
	}
	// ponytail: dial when REDIS_URL is set — upgrade path for real go-redis client
	return nil, nil
}
