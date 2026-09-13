import type { Meta, StoryObj } from "@storybook/nextjs";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="" alt="User" />
      <AvatarFallback>WH</AvatarFallback>
    </Avatar>
  ),
};
