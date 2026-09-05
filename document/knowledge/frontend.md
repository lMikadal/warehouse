# Frontend knowledge

Production Warehouse UI under `frontend/` — Next.js App Router, bun, Tailwind CSS v4, shadcn/ui.

## Stack (icons)

| Piece | Approach |
|-------|----------|
| Icons | `lucide-react` from [Lucide](https://lucide.dev/icons/) |

- Import components (`import { Sun } from "lucide-react"`); size/stroke via props or `className`
- On handoff from design: `design/assets/icons/<name>.svg` → PascalCase Lucide component
- Do not add parallel icon packs or vendor raw SVG trees for icons already in Lucide

## Docs

- Phase checklists: `document/checklist/frontend/`
