package system

import (
	"context"
	"database/sql"
	"fmt"
)

type MenuPermissionRepository struct {
	db *sql.DB
}

func NewMenuPermissionRepository(db *sql.DB) *MenuPermissionRepository {
	return &MenuPermissionRepository{db: db}
}

// LoadMenuViewCodes maps menu id → view permission code from system_menu_permission.
func (r *MenuPermissionRepository) LoadMenuViewCodes(ctx context.Context) (map[int64]string, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT smp.system_menu_id, sp.code
FROM system_menu_permission smp
JOIN system_permission sp ON sp.id = smp.system_permission_id
WHERE sp.action = 'view'
  AND sp.deleted_at IS NULL
  AND sp.is_active = TRUE`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[int64]string)
	for rows.Next() {
		var menuID int64
		var code string
		if err := rows.Scan(&menuID, &code); err != nil {
			return nil, err
		}
		if prev, ok := out[menuID]; ok {
			return nil, fmt.Errorf("duplicate view permission for menu %d: %q and %q", menuID, prev, code)
		}
		out[menuID] = code
	}
	return out, rows.Err()
}
