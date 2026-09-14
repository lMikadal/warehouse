package api

type ListResponse[T any] struct {
	Items []T      `json:"items"`
	Meta  ListMeta `json:"meta"`
}

func NewListResponse[T any](items []T, total int64, q PageQuery) ListResponse[T] {
	if items == nil {
		items = []T{}
	}
	return ListResponse[T]{
		Items: items,
		Meta: ListMeta{
			Total: total,
			Page:  q.Page,
			Limit: q.Limit,
		},
	}
}
