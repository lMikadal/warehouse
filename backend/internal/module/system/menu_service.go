package system

import "context"

type MenuService struct {
	repo *MenuRepository
}

func NewMenuService(repo *MenuRepository) *MenuService {
	return &MenuService{repo: repo}
}

func (s *MenuService) List(ctx context.Context, f MenuListFilter) ([]MenuListItemResponse, int64, error) {
	rows, total, err := s.repo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}
	out := make([]MenuListItemResponse, len(rows))
	for i, row := range rows {
		out[i] = toMenuListItem(row)
	}
	return out, total, nil
}
