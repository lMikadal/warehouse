package system

import "context"

type PermissionService struct {
	repo *PermissionRepository
}

func NewPermissionService(repo *PermissionRepository) *PermissionService {
	return &PermissionService{repo: repo}
}

func (s *PermissionService) List(ctx context.Context, f PermissionListFilter) ([]PermissionListItem, int64, error) {
	rows, total, err := s.repo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}
	out := make([]PermissionListItem, len(rows))
	for i, r := range rows {
		out[i] = PermissionListItem(r)
	}
	return out, total, nil
}

func (s *PermissionService) SetActive(ctx context.Context, id int64, active bool, actorID int64) (PermissionListItem, error) {
	row, err := s.repo.SetActive(ctx, id, active, actorID)
	if err != nil {
		return PermissionListItem{}, err
	}
	return PermissionListItem(row), nil
}
