package system

import (
	"errors"
	"fmt"
	"math"
	"time"
)

var (
	ErrCodePrefixNotFound  = errors.New("system code prefix not found")
	ErrCodePrefixInactive  = errors.New("system code prefix inactive")
	ErrCodePrefixOverflow  = errors.New("system code sequence overflow")
	ErrCodePrefixUnsupported = errors.New("system code format unsupported")
)

// CodeResetBucket returns the period_key bucket used for reset comparisons.
func CodeResetBucket(resetPeriod string, at time.Time, loc *time.Location) string {
	t := at.In(loc)
	switch resetPeriod {
	case "month":
		return t.Format("200601")
	case "year":
		return t.Format("2006")
	default:
		return ""
	}
}

// CodeFormatYYYYMM returns the YYYYMM segment embedded in formatted codes.
func CodeFormatYYYYMM(resetPeriod, periodKey string, at time.Time, loc *time.Location) string {
	if resetPeriod == "month" && periodKey != "" {
		return periodKey
	}
	return at.In(loc).Format("200601")
}

// FormatPrefixCode builds {PREFIX}-{YYYYMM}-{seq} with zero-padded seq.
func FormatPrefixCode(prefix, yyyymm string, seq int64, seqWidth int16, formatStyle string) (string, error) {
	if formatStyle != "prefix_yyyymm_dash_seq" {
		return "", ErrCodePrefixUnsupported
	}
	max := int64(math.Pow10(int(seqWidth))) - 1
	if seq < 1 || seq > max {
		return "", ErrCodePrefixOverflow
	}
	return fmt.Sprintf("%s-%s-%0*d", prefix, yyyymm, int(seqWidth), seq), nil
}
