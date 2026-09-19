package system

import (
	"testing"
	"time"
)

func TestCodeResetBucket(t *testing.T) {
	loc, _ := time.LoadLocation("Asia/Bangkok")
	at := time.Date(2026, 3, 15, 12, 0, 0, 0, loc)

	if got := CodeResetBucket("month", at, loc); got != "202603" {
		t.Fatalf("month bucket: got %q", got)
	}
	if got := CodeResetBucket("year", at, loc); got != "2026" {
		t.Fatalf("year bucket: got %q", got)
	}
	if got := CodeResetBucket("none", at, loc); got != "" {
		t.Fatalf("none bucket: got %q", got)
	}
}

func TestFormatPrefixCode(t *testing.T) {
	code, err := FormatPrefixCode("MEM", "202603", 1, 5, "prefix_yyyymm_dash_seq")
	if err != nil || code != "MEM-202603-00001" {
		t.Fatalf("width 5: got %q err %v", code, err)
	}
	code, err = FormatPrefixCode("MEM", "202603", 1, 3, "prefix_yyyymm_dash_seq")
	if err != nil || code != "MEM-202603-001" {
		t.Fatalf("width 3: got %q err %v", code, err)
	}
	_, err = FormatPrefixCode("MEM", "202603", 1000, 3, "prefix_yyyymm_dash_seq")
	if err != ErrCodePrefixOverflow {
		t.Fatalf("overflow: got %v", err)
	}
}

func TestCodeFormatYYYYMM(t *testing.T) {
	loc, _ := time.LoadLocation("Asia/Bangkok")
	at := time.Date(2026, 4, 1, 0, 0, 0, 0, loc)
	if got := CodeFormatYYYYMM("month", "202603", at, loc); got != "202603" {
		t.Fatalf("month uses period_key: got %q", got)
	}
	if got := CodeFormatYYYYMM("none", "", at, loc); got != "202604" {
		t.Fatalf("none uses clock: got %q", got)
	}
}
