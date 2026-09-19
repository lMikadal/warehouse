package member

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

func insertMemberHistoryTx(ctx context.Context, tx *sql.Tx, userID, actorID int64, titles, descriptions map[string]string) (int64, error) {
	if err := validateNames(titles); err != nil {
		return 0, err
	}
	var id int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO member_history (member_user_id, created_by) VALUES ($1, $2) RETURNING id`,
		userID, nullActor(actorID)).Scan(&id); err != nil {
		return 0, err
	}
	for _, loc := range []string{"th", "en"} {
		title := strings.TrimSpace(titles[loc])
		desc := strings.TrimSpace(descriptions[loc])
		if _, err := tx.ExecContext(ctx, `
INSERT INTO member_history_language (member_history_id, locale, title, description) VALUES ($1, $2, $3, $4)
ON CONFLICT (member_history_id, locale) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = NOW()`,
			id, loc, title, desc); err != nil {
			return 0, err
		}
	}
	return id, nil
}

func productItemLabel(ctx context.Context, q queryRower, productItemID int64, locale string) string {
	if productItemID <= 0 {
		return "—"
	}
	if locale == "" {
		locale = "th"
	}
	var label string
	err := q.QueryRowContext(ctx, `
SELECT TRIM(COALESCE(i.sku, '') || ' ' || COALESCE(il.name, ''))
FROM product_item i
LEFT JOIN product_item_language il ON il.product_item_id = i.id AND il.locale = $1
WHERE i.id = $2 AND i.deleted_at IS NULL`, locale, productItemID).Scan(&label)
	if err != nil {
		return fmt.Sprintf("#%d", productItemID)
	}
	label = strings.TrimSpace(label)
	if label == "" {
		return fmt.Sprintf("#%d", productItemID)
	}
	return label
}

type queryRower interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}
