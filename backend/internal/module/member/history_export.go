package member

import (
	"context"
	"database/sql"
)

// InsertMemberHistoryInTx writes member_history + languages inside an open transaction.
func InsertMemberHistoryInTx(ctx context.Context, tx *sql.Tx, userID, actorID int64, titles, descriptions map[string]string) (int64, error) {
	return insertMemberHistoryTx(ctx, tx, userID, actorID, titles, descriptions)
}

func OrderCreatedHistoryTitles(sku string) map[string]string {
	if sku == "" {
		sku = "—"
	}
	return map[string]string{
		"th": "สร้างใบจัด " + sku,
		"en": "Picking slip " + sku + " created",
	}
}
