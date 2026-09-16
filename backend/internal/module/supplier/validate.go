package supplier

import (
	"regexp"
	"strings"
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
var telRe = regexp.MustCompile(`^[0-9-]*$`)

func validEmail(s string) bool {
	return emailRe.MatchString(s)
}

func validTel(s string) bool {
	return telRe.MatchString(s)
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func validateInformation(info InformationInput, requireName bool) string {
	if requireName {
		name := ""
		if info.Name != nil {
			name = strings.TrimSpace(*info.Name)
		}
		if name == "" {
			return "contact name required"
		}
	}
	if info.Email != nil {
		e := strings.TrimSpace(*info.Email)
		if e != "" && !validEmail(e) {
			return "invalid email"
		}
	}
	if info.Tel != nil {
		t := strings.TrimSpace(*info.Tel)
		if t != "" && !validTel(t) {
			return "invalid tel"
		}
	}
	if info.Branch != nil {
		b := strings.TrimSpace(*info.Branch)
		if b != "" && b != "headquarter" && b != "branch" {
			return "invalid branch"
		}
	}
	return ""
}

func validateContactInput(in ContactInput) string {
	if strings.TrimSpace(in.Name) == "" {
		return "name required"
	}
	if in.Email != nil {
		e := strings.TrimSpace(*in.Email)
		if e != "" && !validEmail(e) {
			return "invalid email"
		}
	}
	if in.Tel != nil {
		t := strings.TrimSpace(*in.Tel)
		if t != "" && !validTel(t) {
			return "invalid tel"
		}
	}
	return ""
}

func validateBankInput(in BankInput) string {
	if strings.TrimSpace(in.Name) == "" || strings.TrimSpace(in.Number) == "" || in.SettingBankID <= 0 {
		return "bank fields required"
	}
	return ""
}
