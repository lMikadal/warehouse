import type { Meta, StoryObj } from "@storybook/nextjs";
import { composeStories } from "@storybook/react";
import type { ComponentType } from "react";

import {
  CatalogOverviewPanels,
  GuideCard,
  ThemeBasicsCard,
} from "./component-catalog-overview";
import {
  countByGroup,
  loadCatalogEntries,
  type CatalogEntry,
  type CatalogGroup,
} from "./component-catalog-load-stories";

const catalogEntries = loadCatalogEntries();
const groupCounts = countByGroup(catalogEntries);

function ComponentStoryCard({ entry }: { entry: CatalogEntry }) {
  const composed = composeStories(entry.module);
  const storyNames = Object.keys(composed);

  return (
    <GuideCard title={entry.metaTitle} badge={`${storyNames.length} stories`}>
      <div className="space-y-4">
        {storyNames.map((name) => {
          const Story = composed[name as keyof typeof composed] as ComponentType;
          return (
            <div key={name} className="space-y-2">
              <p className="text-muted-foreground font-mono text-xs">{name}</p>
              <div className="border-border max-h-96 overflow-x-auto overflow-y-auto rounded-lg border bg-background p-3">
                <Story />
              </div>
            </div>
          );
        })}
      </div>
    </GuideCard>
  );
}

const GROUP_LABELS: { group: CatalogGroup; dotClass: string }[] = [
  { group: "UI", dotClass: "bg-primary" },
  { group: "Molecules", dotClass: "bg-chart-3" },
  { group: "Design system", dotClass: "bg-chart-5" },
];

function ComponentCatalogPanel() {
  return (
    <div className="bg-page-wash -m-6 min-h-screen min-w-0">
      <div className="mx-auto max-w-7xl px-admin-content py-8 lg:grid lg:grid-cols-[minmax(240px,280px)_1fr] lg:gap-10">
        <aside className="mb-8 space-y-6 lg:sticky lg:top-6 lg:mb-0 lg:self-start">
          <span className="bg-primary/10 text-primary inline-flex rounded-full px-2.5 py-1 text-xs font-medium">
            Storybook catalog
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Component overview</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Eva-style primitives at the top, then every exported story in one scrollable
              page. Open the sidebar tree for isolated docs, controls, and a11y checks per
              component.
            </p>
          </div>
          <ul className="text-muted-foreground space-y-2 text-sm">
            {GROUP_LABELS.map(({ group, dotClass }) => (
              <li key={group} className="flex items-center gap-2">
                <span
                  className={`size-2 shrink-0 rounded-full ${dotClass}`}
                  aria-hidden
                />
                {group}
                <span className="text-foreground font-medium">
                  ({groupCounts[group]})
                </span>
              </li>
            ))}
            <li className="text-foreground pt-1 font-medium">
              {catalogEntries.length} components ·{" "}
              {catalogEntries.reduce(
                (n, e) => n + Object.keys(composeStories(e.module)).length,
                0
              )}{" "}
              stories total
            </li>
          </ul>
        </aside>

        <main className="grid gap-5 xl:grid-cols-2">
          <ThemeBasicsCard />
          <CatalogOverviewPanels />
          {catalogEntries.map((entry) => (
            <ComponentStoryCard key={`${entry.group}-${entry.id}`} entry={entry} />
          ))}
        </main>
      </div>
    </div>
  );
}

const meta = {
  title: "Design system/Overview",
  component: ComponentCatalogPanel,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ComponentCatalogPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Catalog: Story = {
  render: () => <ComponentCatalogPanel />,
};
