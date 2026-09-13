"use client";

import { Star } from "lucide-react";

import { FormCard } from "@/components/molecules/form-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GuideCard({
  title,
  badge,
  description,
  children,
  className = "",
}: {
  title: string;
  badge?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FormCard className={`gap-4 p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="text-muted-foreground text-xs">{description}</p>
          ) : null}
        </div>
        {badge ? (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </FormCard>
  );
}

function MatrixRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <span className="text-muted-foreground w-20 shrink-0 pt-1.5 font-mono text-[10px] uppercase tracking-wide">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function ThemeBasicsCard() {
  const typeSamples = [
    { label: "text-2xl / page title", className: "text-2xl font-bold" },
    { label: "text-xl", className: "text-xl font-semibold" },
    { label: "text-lg", className: "text-lg font-semibold" },
    { label: "text-base / body", className: "text-base" },
    { label: "text-sm", className: "text-sm" },
    { label: "text-xs", className: "text-xs" },
  ] as const;

  const colorSwatches = [
    { label: "primary", className: "bg-primary" },
    { label: "success", className: "bg-success" },
    { label: "warning", className: "bg-warning" },
    { label: "destructive", className: "bg-destructive" },
    { label: "muted", className: "bg-muted" },
    { label: "border", className: "bg-border" },
    { label: "background", className: "bg-background border-border border" },
  ] as const;

  return (
    <GuideCard
      title="Theme basics"
      description="Shared typography and semantic colors (globals.css / Tailwind theme)"
      className="xl:col-span-2"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Typography · font-sans
          </p>
          <div className="space-y-2">
            {typeSamples.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5">
                <span className={row.className}>The quick brown fox</span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Semantic colors
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {colorSwatches.map((swatch) => (
              <div key={swatch.label} className="space-y-1">
                <div className={`h-12 w-full rounded-lg ${swatch.className}`} />
                <span className="text-muted-foreground font-mono text-[10px]">
                  {swatch.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GuideCard>
  );
}

const checkboxStatusClass = {
  default: "",
  success:
    "data-checked:border-success data-checked:bg-success data-checked:text-success-foreground dark:data-checked:bg-success",
  warning:
    "data-checked:border-warning data-checked:bg-warning data-checked:text-warning-foreground dark:data-checked:bg-warning",
  destructive:
    "data-checked:border-destructive data-checked:bg-destructive data-checked:text-white dark:data-checked:bg-destructive",
} as const;

const radioStatusClass = checkboxStatusClass;

const switchStatusClass = {
  default: "",
  success: "data-checked:bg-success",
  warning: "data-checked:bg-warning",
  destructive: "data-checked:bg-destructive",
} as const;

function ButtonOverviewCard() {
  return (
    <GuideCard
      title="Button"
      description="State, size, variant, and semantic status (Eva-style matrix)"
      className="xl:col-span-2"
    >
      <div className="space-y-4">
        <MatrixRow label="State">
          <Button>Default</Button>
          <Button disabled>Disabled</Button>
        </MatrixRow>
        <MatrixRow label="Size">
          <Button size="lg">Large</Button>
          <Button>Medium</Button>
          <Button size="sm">Small</Button>
          <Button size="xs">X-Small</Button>
          <Button size="icon" aria-label="Star">
            <Star />
          </Button>
        </MatrixRow>
        <MatrixRow label="Type">
          <Button>Fill</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </MatrixRow>
        <MatrixRow label="Status">
          <Button>Primary</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="destructive">Danger</Button>
          <Button variant="success" size="icon" aria-label="Success">
            <Star />
          </Button>
          <Button variant="warning" size="icon" aria-label="Warning">
            <Star />
          </Button>
        </MatrixRow>
      </div>
    </GuideCard>
  );
}

function FormElementsOverviewCard() {
  return (
    <GuideCard title="Form elements" description="Inputs, search, textarea, select">
      <div className="space-y-4">
        <MatrixRow label="Default">
          <Input className="max-w-xs" placeholder="Default text" />
        </MatrixRow>
        <MatrixRow label="Disabled">
          <Input className="max-w-xs" disabled placeholder="Disabled" />
        </MatrixRow>
        <MatrixRow label="Invalid">
          <Input
            className="max-w-xs"
            aria-invalid
            defaultValue="Invalid value"
          />
        </MatrixRow>
        <MatrixRow label="Success">
          <Input
            className="max-w-xs border-success ring-success/30 focus-visible:border-success focus-visible:ring-success/30"
            defaultValue="Success text"
          />
        </MatrixRow>
        <MatrixRow label="Warning">
          <Input
            className="max-w-xs border-warning ring-warning/30 focus-visible:border-warning focus-visible:ring-warning/30"
            defaultValue="Warning text"
          />
        </MatrixRow>
        <MatrixRow label="Search">
          <Input className="max-w-xs" type="search" placeholder="Search" />
        </MatrixRow>
        <MatrixRow label="Textarea">
          <Textarea className="max-w-xs" placeholder="Notes" rows={3} />
        </MatrixRow>
        <MatrixRow label="Select">
          <Select defaultValue="">
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Please select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" disabled>
                Please select status
              </SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </MatrixRow>
      </div>
    </GuideCard>
  );
}

function SelectionControlCard({
  title,
  kind,
}: {
  title: string;
  kind: "checkbox" | "radio" | "switch";
}) {
  const statusKeys = ["default", "success", "warning", "destructive"] as const;

  return (
    <GuideCard title={title}>
      <div className="space-y-4">
        <MatrixRow label="Off">
          {kind === "checkbox" ? <Checkbox /> : null}
          {kind === "radio" ? (
            <RadioGroup defaultValue="">
              <RadioGroupItem value="off" aria-label="Off" />
            </RadioGroup>
          ) : null}
          {kind === "switch" ? <Switch /> : null}
        </MatrixRow>
        <MatrixRow label="On">
          {kind === "checkbox" ? <Checkbox defaultChecked /> : null}
          {kind === "radio" ? (
            <RadioGroup defaultValue="on">
              <RadioGroupItem value="on" aria-label="On" />
            </RadioGroup>
          ) : null}
          {kind === "switch" ? <Switch defaultChecked /> : null}
        </MatrixRow>
        <MatrixRow label="Disabled">
          {kind === "checkbox" ? <Checkbox disabled /> : null}
          {kind === "radio" ? (
            <RadioGroup defaultValue="on" disabled>
              <RadioGroupItem value="on" aria-label="Disabled" />
            </RadioGroup>
          ) : null}
          {kind === "switch" ? <Switch disabled /> : null}
        </MatrixRow>
        <MatrixRow label="Status">
          {statusKeys.map((status) => {
            if (kind === "checkbox") {
              return (
                <Checkbox
                  key={status}
                  defaultChecked
                  className={checkboxStatusClass[status]}
                  aria-label={status}
                />
              );
            }
            if (kind === "radio") {
              return (
                <RadioGroup key={status} defaultValue="s">
                  <RadioGroupItem
                    value="s"
                    className={radioStatusClass[status]}
                    aria-label={status}
                  />
                </RadioGroup>
              );
            }
            return (
              <Switch
                key={status}
                defaultChecked
                className={switchStatusClass[status]}
                aria-label={status}
              />
            );
          })}
        </MatrixRow>
      </div>
    </GuideCard>
  );
}

function NavigationOverviewCard() {
  return (
    <GuideCard title="Navigation">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Warehouse</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </GuideCard>
  );
}

function TabsOverviewCard() {
  return (
    <GuideCard title="Tabs">
      <Tabs defaultValue="a" className="w-full max-w-md">
        <TabsList>
          <TabsTrigger value="a">Tab one</TabsTrigger>
          <TabsTrigger value="b">Tab two</TabsTrigger>
          <TabsTrigger value="c">Tab three</TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="text-muted-foreground text-sm">
          First tab panel.
        </TabsContent>
      </Tabs>
    </GuideCard>
  );
}

function ButtonGroupOverviewCard() {
  return (
    <GuideCard title="Button group">
      <ButtonGroup>
        <Button variant="outline">Left</Button>
        <Button variant="outline">Center</Button>
        <Button variant="outline">Right</Button>
      </ButtonGroup>
    </GuideCard>
  );
}

function AvatarOverviewCard() {
  return (
    <GuideCard title="Avatar">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src="" alt="User" />
          <AvatarFallback>WH</AvatarFallback>
        </Avatar>
        <div className="space-y-0.5 text-sm">
          <p className="font-medium">Warehouse user</p>
          <p className="text-muted-foreground text-xs">Fallback initials</p>
        </div>
      </div>
    </GuideCard>
  );
}

function DropdownOverviewCard() {
  return (
    <GuideCard title="Overflow menu">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          Open menu
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>View</DropdownMenuItem>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </GuideCard>
  );
}

function TooltipPopoverOverviewCard() {
  return (
    <GuideCard title="Tooltip & popover" className="xl:col-span-2">
      <div className="flex flex-wrap gap-4">
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" />}>
            Hover tooltip
          </TooltipTrigger>
          <TooltipContent>Short hint text</TooltipContent>
        </Tooltip>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            Open popover
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <PopoverHeader>
              <PopoverTitle>Popover title</PopoverTitle>
              <PopoverDescription>
                Contextual content in a floating panel.
              </PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </div>
    </GuideCard>
  );
}

export function CatalogOverviewPanels() {
  return (
    <>
      <ButtonOverviewCard />
      <FormElementsOverviewCard />
      <SelectionControlCard title="Checkbox" kind="checkbox" />
      <SelectionControlCard title="Radio button" kind="radio" />
      <SelectionControlCard title="Toggle (switch)" kind="switch" />
      <NavigationOverviewCard />
      <TabsOverviewCard />
      <ButtonGroupOverviewCard />
      <AvatarOverviewCard />
      <DropdownOverviewCard />
      <TooltipPopoverOverviewCard />
    </>
  );
}
