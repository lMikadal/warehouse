package system

import (
	"context"
	"database/sql"
	"errors"
)

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
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	out := make([]MenuListItemResponse, len(rows))
	for i, row := range rows {
		out[i] = toMenuListItem(row, locale)
	}
	return out, total, nil
}

func (s *MenuService) Get(ctx context.Context, id int64, locale string) (MenuListItemResponse, error) {
	row, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return MenuListItemResponse{}, sql.ErrNoRows
		}
		return MenuListItemResponse{}, err
	}
	if locale == "" {
		locale = "th"
	}
	return toMenuListItem(row, locale), nil
}

func (s *MenuService) Create(ctx context.Context, in MenuCreateInput) (MenuListItemResponse, error) {
	row, err := s.repo.Create(ctx, in)
	if err != nil {
		return MenuListItemResponse{}, err
	}
	return toMenuListItem(row, "th"), nil
}

func (s *MenuService) Update(ctx context.Context, id int64, in MenuUpdateInput) (MenuListItemResponse, error) {
	row, err := s.repo.Update(ctx, id, in)
	if err != nil {
		return MenuListItemResponse{}, err
	}
	return toMenuListItem(row, "th"), nil
}

func (s *MenuService) Move(ctx context.Context, dragID, targetID int64, zone string, actorID int64) error {
	return s.repo.Move(ctx, dragID, targetID, zone, actorID)
}

func (s *MenuService) Delete(ctx context.Context, id int64, actorID int64) error {
	return s.repo.SoftDeleteSubtree(ctx, id, actorID)
}
