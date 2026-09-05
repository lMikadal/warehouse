# Warehouse frontend

Before editing code here, read:

1. [`.cursor/skills/frontend/SKILL.md`](../.cursor/skills/frontend/SKILL.md) — stack, bootstrap, theme, i18n, API
2. [`.cursor/rules/makefile.mdc`](../.cursor/rules/makefile.mdc) — prefer `make frontend-*` over raw `bun` / `bunx`
3. [`.cursor/rules/document.mdc`](../.cursor/rules/document.mdc) — sync `document/checklist/frontend/` and `document/knowledge/frontend.md`
4. [`.cursor/rules/icons.mdc`](../.cursor/rules/icons.mdc) — Lucide only (`lucide-react`)
5. [`.cursor/rules/ponytail.mdc`](../.cursor/rules/ponytail.mdc) — minimal diffs
6. [`.cursor/rules/subprojects.mdc`](../.cursor/rules/subprojects.mdc) — which skill maps to which folder

Do not invent parallel APIs or bypass make targets that already exist (`make help`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
