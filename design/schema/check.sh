#!/usr/bin/env bash
# check.sh — validates design/schema/*.sql conventions
# Usage: bash design/schema/check.sh
# Exit 0 = all clear. Exit 1 = violations found.
#
# Rules checked:
#   1. Filename matches the CREATE TABLE name in the file
#   2. Base tables (have "id BIGSERIAL PRIMARY KEY", not *_language.sql, not check:skip-audit)
#      must contain all five audit columns: created_at, updated_at, deleted_at, created_by, updated_by
#   3. *_language.sql files must contain "locale", a UNIQUE constraint, and must NOT contain "deleted_at"
#   4. Every REFERENCES <table>(…) target must have a matching <table>.sql file in this directory
#   5. Files with tree_path must have sort_order and parent_id (self-FK tree trio)

set -euo pipefail
SCHEMA_DIR="$(cd "$(dirname "$0")" && pwd)"
ERRORS=0

err() { echo "  FAIL: $1"; ERRORS=$((ERRORS + 1)); }

for f in "$SCHEMA_DIR"/*.sql; do
  [ -f "$f" ] || continue
  filename=$(basename "$f" .sql)
  content=$(cat "$f")

  # ── Rule 1: filename == CREATE TABLE name ─────────────────────────────────
  table=$(grep -oiE 'CREATE TABLE [a-z0-9_]+' "$f" | head -1 | awk '{print $NF}')
  if [ -z "$table" ]; then
    err "[$filename] no CREATE TABLE statement found"
  elif [ "$table" != "$filename" ]; then
    err "[$filename] table name '$table' does not match filename"
  fi

  # ── Rule 3: *_language files (companion tables, not the website_language registry itself) ───
  if [[ "$filename" == *_language && "$filename" != "website_language" ]]; then
    if ! grep -q '\blocale\b' "$f"; then
      err "[$filename] missing 'locale' column"
    fi
    if ! grep -qiE 'UNIQUE \([^)]*locale[^)]*\)' "$f"; then
      err "[$filename] missing UNIQUE constraint containing 'locale'"
    fi
    if grep -q '\bdeleted_at\b' "$f"; then
      err "[$filename] *_language table must NOT have deleted_at"
    fi
    # skip audit-5 check for language files
    continue
  fi

  # ── Rule 2: base table audit columns ─────────────────────────────────────
  # Skip: files marked check:skip-audit (session/log/junction tables)
  if grep -q 'check:skip-audit' "$f"; then
    continue
  fi
  # Skip: junction tables (no "id BIGSERIAL PRIMARY KEY" — composite PK)
  if ! grep -qiE 'id\s+BIGSERIAL\s+(NOT NULL\s+)?PRIMARY KEY' "$f"; then
    continue
  fi

  for col in created_at updated_at deleted_at created_by updated_by; do
    if ! grep -q "\b${col}\b" "$f"; then
      err "[$filename] missing audit column: $col"
    fi
  done

  # ── Rule 5: self-FK tree tables need parent_id + tree_path + sort_order ───
  if grep -q '\btree_path\b' "$f"; then
    for col in parent_id sort_order; do
      if ! grep -q "\b${col}\b" "$f"; then
        err "[$filename] tree table missing '$col' (required with tree_path)"
      fi
    done
  fi
done

# ── Rule 4: REFERENCES targets have .sql files ────────────────────────────
for f in "$SCHEMA_DIR"/*.sql; do
  [ -f "$f" ] || continue
  filename=$(basename "$f" .sql)
  while IFS= read -r ref; do
    target=$(echo "$ref" | grep -oiE 'REFERENCES [a-z0-9_]+' | awk '{print $2}')
    [ -z "$target" ] && continue
    if [ ! -f "$SCHEMA_DIR/${target}.sql" ]; then
      err "[$(basename "$f")] REFERENCES $target but ${target}.sql not found"
    fi
  done < <(grep -iE 'REFERENCES [a-z0-9_]+' "$f")
done

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "✓ All schema checks passed ($(ls "$SCHEMA_DIR"/*.sql | wc -l) files)"
  exit 0
else
  echo "✗ $ERRORS violation(s) found"
  exit 1
fi
