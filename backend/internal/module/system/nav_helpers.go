package system

import "strings"

func isNavigablePath(path *string) bool {
	if path == nil {
		return false
	}
	p := strings.TrimSpace(*path)
	return p != "" && p != "#"
}

func derefStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
