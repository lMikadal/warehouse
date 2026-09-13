import * as React from "react";
import { cn } from "cn";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function FormCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "border border-foreground/6 shadow-lg ring-0",
        className
      )}
      {...props}
    />
  );
}

export {
  FormCard,
  CardAction as FormCardAction,
  CardContent as FormCardContent,
  CardDescription as FormCardDescription,
  CardFooter as FormCardFooter,
  CardHeader as FormCardHeader,
  CardTitle as FormCardTitle,
};
