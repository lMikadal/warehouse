import type { Meta, StoryObj } from "@storybook/nextjs";

import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="a">
      <RadioGroupItem value="a" aria-label="Option A" />
      <RadioGroupItem value="b" aria-label="Option B" />
      <RadioGroupItem value="c" aria-label="Option C" />
    </RadioGroup>
  ),
};

export const NoneSelected: Story = {
  render: () => (
    <RadioGroup>
      <RadioGroupItem value="a" aria-label="Option A" />
      <RadioGroupItem value="b" aria-label="Option B" />
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="a" disabled>
      <RadioGroupItem value="a" aria-label="Option A" />
      <RadioGroupItem value="b" aria-label="Option B" />
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="a" className="flex flex-row gap-4">
      <RadioGroupItem value="a" aria-label="Option A" />
      <RadioGroupItem value="b" aria-label="Option B" />
      <RadioGroupItem value="c" aria-label="Option C" />
    </RadioGroup>
  ),
};

export const StatusVariants: Story = {
  name: "Status variants",
  render: () => (
    <div className="flex items-center gap-3">
      {(
        [
          "",
          "data-checked:border-success data-checked:bg-success data-checked:text-success-foreground dark:data-checked:bg-success",
          "data-checked:border-warning data-checked:bg-warning data-checked:text-warning-foreground dark:data-checked:bg-warning",
          "data-checked:border-destructive data-checked:bg-destructive data-checked:text-white dark:data-checked:bg-destructive",
        ] as const
      ).map((cls, i) => (
        <RadioGroup key={i} defaultValue="s">
          <RadioGroupItem value="s" className={cls} aria-label={`Status ${i}`} />
        </RadioGroup>
      ))}
    </div>
  ),
};
