package member

import "strings"

var (
	historyTitleMemberCreated = map[string]string{
		"th": "สร้างสมาชิก",
		"en": "Member created",
	}
	historyTitleFileUploaded = map[string]string{
		"th": "อัปโหลดไฟล์เอกสาร",
		"en": "Document uploaded",
	}
	historyTitleDiscountAdded = map[string]string{
		"th": "เพิ่มส่วนลดพิเศษ",
		"en": "Special discount added",
	}
)

func memberCreatedDescriptions(name string) map[string]string {
	name = strings.TrimSpace(name)
	return map[string]string{
		"th": "เพิ่มรายชื่อ " + name,
		"en": "Added " + name,
	}
}

func fileUploadedDescriptions(originalName string) map[string]string {
	name := strings.TrimSpace(originalName)
	if name == "" {
		name = "—"
	}
	return map[string]string{"th": name, "en": name}
}

func discountAddedDescriptions(labelTh, labelEn string) map[string]string {
	if strings.TrimSpace(labelTh) == "" {
		labelTh = "—"
	}
	if strings.TrimSpace(labelEn) == "" {
		labelEn = labelTh
	}
	return map[string]string{"th": strings.TrimSpace(labelTh), "en": strings.TrimSpace(labelEn)}
}

func localeHistoryTitle(names map[string]string, locale string) string {
	if locale == "" {
		locale = "th"
	}
	if t := strings.TrimSpace(names[locale]); t != "" {
		return t
	}
	if t := strings.TrimSpace(names["th"]); t != "" {
		return t
	}
	return strings.TrimSpace(names["en"])
}
