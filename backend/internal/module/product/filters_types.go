package product

import "github.com/lMikadal/warehouse/backend/internal/api"

type filterItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type filtersResponse struct {
	Items []filterItem `json:"items"`
	Meta  api.ListMeta `json:"meta"`
}
