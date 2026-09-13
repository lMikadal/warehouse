/// <reference types="webpack-env" />

export type StoryModule = {
  default?: { title?: string };
  [key: string]: unknown;
};

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
  ctx: __WebpackModuleApi.Context,
  group: CatalogGroup,
  out: CatalogEntry[]
) {
  ctx.keys().forEach((key) => {
    const id = idFromKey(key);
    if (SKIP_STORY_IDS.has(id)) return;

    const storyModule = ctx(key) as StoryModule;
    const metaTitle =
      typeof storyModule.default?.title === "string"
        ? storyModule.default.title
        : `${group}/${id}`;

    out.push({ group, id, metaTitle, module: storyModule });
  });
}

export function loadCatalogEntries(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];

  pushFromContext(
    require.context("../components/ui", false, /\.stories\.tsx$/),
    "UI",
    entries
  );
  pushFromContext(
    require.context("../components/molecules", false, /\.stories\.tsx$/),
    "Molecules",
    entries
  );
  pushFromContext(
    require.context(".", false, /\.stories\.tsx$/),
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
