package api

// V1Prefix is the URL prefix for all v1 API routes (default; override via InitV1Prefix from config).
var V1Prefix = "/api/v1"

func InitV1Prefix(prefix string) {
	if prefix != "" {
		V1Prefix = prefix
	}
}
