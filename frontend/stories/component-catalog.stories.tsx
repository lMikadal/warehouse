import type { Meta, StoryObj } from "@storybook/nextjs";
import { composeStories } from "@storybook/nextjs";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";

import projectAnnotations from "../.storybook/preview";
import {
  GuideCard,
  ThemeBasicsCard,
} from "./component-catalog-overview";
import {
  countByGroup,
  loadCatalogEntries,
  type CatalogEntry,
  type CatalogGroup,
} from "./component-catalog-load-stories";

type CSFModule = Parameters<typeof composeStories>[0];

function composeCatalogStories(module: CSFModule) {
  return composeStories(module, projectAnnotations);
}

function CatalogComposedStory({
  Story,
}: {
  Story: ComponentType & { load?: () => Promise<void> };
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void (async () => {
      await Story.load?.();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [Story]);

  if (!ready) {
    return (
      <p className="text-muted-foreground text-xs" aria-busy="true">
        …
      </p>
    );
  }

  return <Story />;
}

const catalogEntries = loadCatalogEntries();
const groupCounts = countByGroup(catalogEntries);

function ComponentStoryCard({ entry }: { entry: CatalogEntry }) {
  const composed = composeCatalogStories(entry.module as CSFModule);
  const storyNames = Object.keys(composed);

  return (
    <GuideCard title={entry.metaTitle} badge={`${storyNames.length} stories`}>
      <div className="space-y-4">
        {storyNames.map((name) => {
          const ComposedStory = composed[
            name as keyof typeof composed
          ] as ComponentType & { load?: () => Promise<void> };
          return (
            <div key={name} className="space-y-2">
              <p className="text-muted-foreground font-mono text-xs">{name}</p>
              <div className="border-border max-h-96 overflow-x-auto overflow-y-auto rounded-lg border bg-background">
                <CatalogComposedStory Story={ComposedStory} />
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
                (n, e) =>
                  n + Object.keys(composeCatalogStories(e.module as CSFModule)).length,
                0
              )}{" "}
              stories total
            </li>
          </ul>
        </aside>

        <main className="grid gap-5 xl:grid-cols-2">
          <ThemeBasicsCard />
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
