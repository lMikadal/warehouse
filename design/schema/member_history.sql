-- source: v1 member_member_histories + v2 v2_member_member_histories
--   - restored: created_by (v2 dropped it — cannot audit who wrote the history entry)
-- check:skip-audit (append-only event log; no update/delete semantics)
CREATE TABLE member_history (
    id             BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    member_user_id BIGINT       NOT NULL REFERENCES member_user(id) ON DELETE CASCADE, -- member this event belongs to
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL -- admin who recorded the event
);

CREATE INDEX idx_member_history_user ON member_history (member_user_id, created_at DESC);
