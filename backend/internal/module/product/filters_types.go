package product

import "github.com/lMikadal/warehouse/backend/internal/api"

type filterItem struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	IsDefault    *bool  `json:"is_default,omitempty"`
	SortOrder    *int   `json:"sort_order,omitempty"`
	SystemFileID *int64 `json:"system_file_id,omitempty"`
}

type filtersResponse struct {
	Items []filterItem `json:"items"`
	Meta  api.ListMeta `json:"meta"`
}
