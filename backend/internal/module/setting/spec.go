package setting

type LangKind int

const (
	LangBank LangKind = iota
	LangPaymentMethod
	LangSaleChannel
	LangClaimReason
	LangPrefix
)

type langSpec struct {
	table     string
	langTable string
	langFK    string
}

func langSpecFor(k LangKind) langSpec {
	switch k {
	case LangBank:
		return langSpec{table: "setting_bank", langTable: "setting_bank_language", langFK: "setting_bank_id"}
	case LangPaymentMethod:
		return langSpec{table: "setting_payment_method", langTable: "setting_payment_method_language", langFK: "setting_payment_method_id"}
	case LangSaleChannel:
		return langSpec{table: "setting_sale_channel", langTable: "setting_sale_channel_language", langFK: "setting_sale_channel_id"}
	case LangClaimReason:
		return langSpec{table: "setting_claim_reason", langTable: "setting_claim_reason_language", langFK: "setting_claim_reason_id"}
	case LangPrefix:
		return langSpec{table: "setting_prefix", langTable: "setting_prefix_language", langFK: "setting_prefix_id"}
	default:
		panic("unknown LangKind")
	}
}
