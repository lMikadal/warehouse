package member

type SettingKind int

const (
	SettingCredit SettingKind = iota
	SettingGroup
	SettingBusiness
)

type settingSpec struct {
	table     string
	langTable string
	langFK    string
}

func settingSpecFor(k SettingKind) settingSpec {
	switch k {
	case SettingCredit:
		return settingSpec{table: "member_setting_credit", langTable: "member_setting_credit_language", langFK: "member_setting_credit_id"}
	case SettingGroup:
		return settingSpec{table: "member_setting_group", langTable: "member_setting_group_language", langFK: "member_setting_group_id"}
	case SettingBusiness:
		return settingSpec{table: "member_setting_business", langTable: "member_setting_business_language", langFK: "member_setting_business_id"}
	default:
		panic("unknown SettingKind")
	}
}
