export type StoryModule = {
  default?: { title?: string };
  [key: string]: unknown;
};

/** Minimal webpack require.context shape used only in Storybook (Webpack) builds. */
interface RequireContext {
  keys(): string[];
  (id: string): StoryModule;
}

export type CatalogGroup = "UI" | "Molecules" | "Design system";

export type CatalogEntry = {
  group: CatalogGroup;
  id: string;
  metaTitle: string;
  module: StoryModule;
};

const SKIP_STORY_IDS = new Set(["component-catalog", "design-tokens"]);

function idFromKey(key: string): string {
  return key.replace(/^\.\//, "").replace(/\.stories\.tsx$/, "");
}

function pushFromContext(
  ctx: RequireContext,
  group: CatalogGroup,
  out: CatalogEntry[]
) {
  ctx.keys().forEach((key: string) => {
    const id = idFromKey(key);
    if (SKIP_STORY_IDS.has(id)) return;

    const storyModule = ctx(key);
    const metaTitle =
      typeof storyModule.default?.title === "string"
        ? storyModule.default.title
        : `${group}/${id}`;

    out.push({ group, id, metaTitle, module: storyModule });
  });
}

/** Cast for webpack's require.context — only available in Storybook / Webpack builds. */
type WebpackRequire = NodeRequire & {
  context(directory: string, useSubdirectories: boolean, filter: RegExp): RequireContext;
};

export function loadCatalogEntries(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  const webpackRequire = require as WebpackRequire;

  pushFromContext(
    webpackRequire.context("../components/ui", false, /\.stories\.tsx$/),
    "UI",
    entries
  );
  pushFromContext(
    webpackRequire.context("../components/molecules", false, /\.stories\.tsx$/),
    "Molecules",
    entries
  );
  pushFromContext(
    webpackRequire.context(".", false, /\.stories\.tsx$/),
    "Design system",
    entries
  );

  const groupOrder: Record<CatalogGroup, number> = {
    UI: 0,
    Molecules: 1,
    "Design system": 2,
  };

  entries.sort((a, b) => {
    const byGroup = groupOrder[a.group] - groupOrder[b.group];
    if (byGroup !== 0) return byGroup;
    return a.metaTitle.localeCompare(b.metaTitle);
  });

  return entries;
}

export function countByGroup(entries: CatalogEntry[]): Record<CatalogGroup, number> {
  const counts: Record<CatalogGroup, number> = {
    UI: 0,
    Molecules: 0,
    "Design system": 0,
  };
  for (const entry of entries) {
    counts[entry.group] += 1;
  }
  return counts;
}
