package system

import "strings"

// AllowedFilePurposes matches design/schema/system_file.sql usage tags.
var AllowedFilePurposes = map[string]struct{}{
	"product_attribute_logo":           {},
	"member_avatar":                    {},
	"member_tier_badge":                {},
	"setting_bank_logo":                {},
	"setting_sale_channel_logo":        {},
	"purchase_order_payment_proof":     {},
	"product_item_image":               {},
	"purchase_request_item_image":      {},
	"purchase_order_item_image":        {},
	"purchase_order_item_reject_image": {},
	"member_document":                  {},
	"purchase_order_attachment":        {},
	"order_quotation_attachment":       {},
}

func ValidPurpose(purpose string) bool {
	_, ok := AllowedFilePurposes[strings.TrimSpace(purpose)]
	return ok
}
