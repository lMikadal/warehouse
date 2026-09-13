import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "@/components/ui/button";

function Swatch({
  label,
  className,
  textClassName = "text-foreground",
}: {
  label: string;
  className: string;
  textClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`border-border h-14 w-full rounded-lg border ${className}`}
      />
      <span className={`text-xs ${textClassName}`}>{label}</span>
    </div>
  );
}

function DesignTokensPanel() {
  return (
    <div className="bg-page-wash mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-admin-content py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Design tokens</h1>
        <p className="text-muted-foreground text-sm">
          Reference: design/pages/warehouse-list.html — values from
          design/css/style.css
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Core colors</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Swatch label="primary" className="bg-primary" textClassName="text-muted-foreground" />
          <Swatch
            label="background"
            className="bg-background"
            textClassName="text-muted-foreground"
          />
          <Swatch label="muted (shadcn fill)" className="bg-muted" textClassName="text-muted-foreground" />
          <Swatch
            label="warehouse-border"
            className="bg-warehouse-border"
            textClassName="text-muted-foreground"
          />
          <Swatch
            label="destructive"
            className="bg-destructive"
            textClassName="text-muted-foreground"
          />
          <Swatch
            label="accent"
            className="bg-accent"
            textClassName="text-muted-foreground"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-warehouse-page-title text-xl font-bold tracking-tight">
          Warehouse list patterns
        </h2>
        <p className="text-muted-foreground text-sm">
          Page title uses foreground (not primary) — matches .crud-page-header__title
        </p>

        <div className="max-w-crud-page flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium"
              style={{
                background: "var(--color-success-bg)",
                color: "var(--color-success-fg)",
                borderColor: "var(--color-success-border)",
              }}
            >
              wh-badge active
            </span>
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: "var(--color-status-active-bg)",
                color: "var(--color-status-active-fg)",
              }}
            >
              crud-badge active
            </span>
            <span className="text-warehouse-action-add text-sm font-medium">
              action add #16a34a
            </span>
            <span className="text-warehouse-action-delete text-sm font-medium">
              action delete
            </span>
          </div>

          <div className="surface-table-wrap p-4">
            <p className="text-sm font-medium">surface-table-wrap</p>
            <p className="text-muted-foreground text-xs">
              .crud-table-wrap — border uses --color-border (#e2e8f0)
            </p>
            <div className="bg-row-expanded mt-3 rounded-md px-3 py-2 text-sm">
              bg-row-expanded (.wh-expanded-row)
            </div>
          </div>

          <div className="grid-wh-zone">
            {["Zone A", "Zone B", "Zone C"].map((label) => (
              <div
                key={label}
                className="shadow-zone-card border-warehouse-border rounded-lg border bg-background p-3 text-sm"
              >
                {label} — wh-zone-card
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button>Primary (add warehouse)</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Typography scale</h2>
        <div className="border-border space-y-2 rounded-lg border bg-background p-4">
          <p className="text-xs">text-xs — table header</p>
          <p className="text-sm">text-sm — breadcrumb, meta</p>
          <p className="text-base">text-base — table body</p>
          <p className="text-md">text-md — button copy</p>
          <p className="text-lg">text-lg — section title</p>
          <p className="text-xl">text-xl — crud page title size</p>
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: "Design system/Tokens",
  component: DesignTokensPanel,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof DesignTokensPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LightAndDark: Story = {
  render: () => <DesignTokensPanel />,
};
