-- Shared PostgreSQL enums (cross-module). Loaded before table DDL.
-- Filename prefixed with _ — exempt from check.sh table-name rule.

CREATE TYPE entity_branch      AS ENUM ('headquarter', 'branch');
CREATE TYPE discount_unit      AS ENUM ('percent', 'baht');
CREATE TYPE claim_type           AS ENUM ('claim', 'return');
CREATE TYPE claim_item_status    AS ENUM ('confirmed', 'rejected');
