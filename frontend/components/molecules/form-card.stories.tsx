import type { Meta, StoryObj } from "@storybook/nextjs";

import {
  FormCard,
  FormCardContent,
  FormCardDescription,
  FormCardHeader,
  FormCardTitle,
} from "./form-card";

const meta = {
  title: "Molecules/FormCard",
  component: FormCard,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="bg-background p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <FormCard className="w-72">
      <FormCardContent>
        Form panel surface with warehouse border and shadow.
      </FormCardContent>
    </FormCard>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <FormCard className="w-full max-w-form px-2 py-7">
      <FormCardHeader className="items-center text-center">
        <FormCardTitle className="text-2xl font-bold tracking-tight">
          Admin login
        </FormCardTitle>
        <FormCardDescription>
          Sign in to manage warehouse operations.
        </FormCardDescription>
      </FormCardHeader>
      <FormCardContent className="text-muted-foreground text-sm">
        Form content goes here.
      </FormCardContent>
    </FormCard>
  ),
};
