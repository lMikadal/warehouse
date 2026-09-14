package system

import "github.com/lMikadal/warehouse/backend/internal/api"

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
	Name string
}

type MenuListItemResponse struct {
	ID               int64   `json:"id"`
	Icon             *string `json:"icon,omitempty"`
	Module           string  `json:"module"`
	Path             *string `json:"path,omitempty"`
	ParentID         *int64  `json:"parent_id"`
	SortOrder        int     `json:"sort_order"`
	IsActive         bool    `json:"is_active"`
	IsSuperadminOnly bool    `json:"is_superadmin_only"`
	IsDialog         bool    `json:"is_dialog"`
	Name             string  `json:"name"`
}

func toMenuListItem(r MenuRow) MenuListItemResponse {
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
		Name:             r.Name,
	}
}
