import type { Meta, StoryObj } from "@storybook/nextjs";
import { SearchIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const meta = {
  title: "UI/InputGroup",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <InputGroup className="max-w-xs">
      <InputGroupInput placeholder="Search" />
      <InputGroupAddon align="inline-end">
        <SearchIcon className="size-4 opacity-50" />
      </InputGroupAddon>
    </InputGroup>
  ),
};
