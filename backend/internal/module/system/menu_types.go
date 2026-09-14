package system

import (
	"time"

	"github.com/lMikadal/warehouse/backend/internal/api"
)

type MenuRow struct {
	ID               int64
	Icon             *string
	Module           string
	Path             *string
	ParentID         *int64
	TreePath         string
	SortOrder        int
	IsActive         bool
	IsSuperadminOnly bool
	IsDialog         bool
	api.Audit
	Name  string
	Names map[string]string
}

type MenuNames struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type MenuListItemResponse struct {
	ID               int64     `json:"id"`
	Icon             *string   `json:"icon,omitempty"`
	Module           string    `json:"module"`
	Path             *string   `json:"path,omitempty"`
	ParentID         *int64    `json:"parent_id"`
	SortOrder        int       `json:"sort_order"`
	IsActive         bool      `json:"is_active"`
	IsSuperadminOnly bool      `json:"is_superadmin_only,omitempty"`
	IsDialog         bool      `json:"is_dialog,omitempty"`
	TreePath         string    `json:"tree_path"`
	Names            MenuNames `json:"names"`
	Name             string    `json:"name,omitempty"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func toMenuListItem(r MenuRow, locale string) MenuListItemResponse {
	names := MenuNames{}
	if r.Names != nil {
		names.Th = r.Names["th"]
		names.En = r.Names["en"]
	}
	name := r.Name
	if name == "" {
		if locale == "en" {
			name = names.En
		} else {
			name = names.Th
		}
	}
	return MenuListItemResponse{
		ID:               r.ID,
		Icon:             r.Icon,
		Module:           r.Module,
		Path:             r.Path,
		ParentID:         r.ParentID,
		SortOrder:        r.SortOrder,
		IsActive:         r.IsActive,
		IsSuperadminOnly: r.IsSuperadminOnly,
		IsDialog:         r.IsDialog,
		TreePath:         r.TreePath,
		Names:            names,
		Name:             name,
		UpdatedAt:        r.UpdatedAt,
	}
}
