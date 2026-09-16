package supplier

import (
	"database/sql"
	"time"
)

const (
	InfoContact    = "contact"
	InfoTaxInvoice = "tax_invoice"
	InfoDelivery   = "delivery"
)

type UserRow struct {
	ID             int64
	SKU            string
	CreditTerm     sql.NullInt32
	CreditTermNote sql.NullString
	IsActive       bool
	UpdatedAt      time.Time
	// list display from contact information
	TaxNumber        sql.NullString
	CompanyName      sql.NullString
	SettingPrefixID  sql.NullInt64
	CompanyAddress   sql.NullString
	ContactTel       sql.NullString
	ContactEmail     sql.NullString
}

type InformationRow struct {
	Type                string
	SettingPrefixID     sql.NullInt64
	Name                sql.NullString
	Branch              sql.NullString
	BranchName          sql.NullString
	TaxNumber           sql.NullString
	Address             sql.NullString
	WebsiteProvinceID   sql.NullInt64
	WebsiteDistrictID   sql.NullInt64
	WebsiteSubDistrictID sql.NullInt64
	Postcode            sql.NullString
	Tel                 sql.NullString
	Email               sql.NullString
	IsSameInformation   bool
}

type ContactRow struct {
	ID       int64
	Name     string
	Email    sql.NullString
	Tel      sql.NullString
	Position sql.NullString
	SortOrder int
}

type BankRow struct {
	ID            int64
	SettingBankID int64
	Name          string
	Number        string
	Branch        sql.NullString
	IsActive      bool
	IsDefault     bool
	SortOrder     int
}

type UserListFilter struct {
	Page     int
	Limit    int
	Search   string
	IsActive *bool
	Sort     string
	Order    string
}

type InformationInput struct {
	SettingPrefixID      *int64  `json:"setting_prefix_id"`
	Name                 *string `json:"name"`
	Branch               *string `json:"branch"`
	BranchName           *string `json:"branch_name"`
	TaxNumber            *string `json:"tax_number"`
	Address              *string `json:"address"`
	WebsiteProvinceID    *int64  `json:"website_province_id"`
	WebsiteDistrictID    *int64  `json:"website_district_id"`
	WebsiteSubDistrictID *int64  `json:"website_sub_district_id"`
	Postcode             *string `json:"postcode"`
	Tel                  *string `json:"tel"`
	Email                *string `json:"email"`
	IsSameInformation    *bool   `json:"is_same_information"`
}

type ContactInput struct {
	Name     string  `json:"name"`
	Email    *string `json:"email"`
	Tel      *string `json:"tel"`
	Position *string `json:"position"`
}

type BankInput struct {
	SettingBankID int64   `json:"setting_bank_id"`
	Name          string  `json:"name"`
	Number        string  `json:"number"`
	Branch        *string `json:"branch"`
	IsActive      *bool   `json:"is_active"`
	IsDefault     *bool   `json:"is_default"`
}

type CreateUserInput struct {
	SKU            string
	CreditTerm     *int32
	CreditTermNote *string
	IsActive       bool
	Information    map[string]InformationInput
	Contacts       []ContactInput
	Banks          []BankInput
}

type PatchUserInput struct {
	SKU            *string
	CreditTerm     *int32
	CreditTermNote *string
	IsActive       *bool
	Information    map[string]InformationInput
}
