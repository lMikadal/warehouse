"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrderCompareTreeNode } from "@/lib/order-compare-api";

export type TreeScopePick = {
  brandId: number;
  brandName: string;
  categoryId?: number | null;
  categoryName?: string;
};

type Props = {
  brands: OrderCompareTreeNode[];
  onSelectScope: (scope: TreeScopePick) => void;
  scopeDefined?: (brandId: number, categoryId?: number | null) => boolean;
};

function NodeRows({
  node,
  depth,
  brandId,
  brandName,
  expanded,
  toggle,
  onSelectScope,
  scopeDefined,
  isBrand,
}: {
  node: OrderCompareTreeNode;
  depth: number;
  brandId: number;
  brandName: string;
  expanded: Set<string>;
  toggle: (key: string) => void;
  onSelectScope: (scope: TreeScopePick) => void;
  scopeDefined?: Props["scopeDefined"];
  isBrand?: boolean;
}) {
  const t = useTranslations("orderCompare");
  const key = isBrand ? `b-${node.id}` : `c-${node.id}`;
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(key);
  const defined =
    scopeDefined?.(brandId, isBrand ? null : node.id) ?? node.is_defined;

  return (
    <Fragment>
      <TableRow>
        <TableCell>
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${depth * 1.25}rem` }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-expanded={isOpen}
                onClick={() => toggle(key)}
              >
                {isOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            ) : (
              <span className="inline-block size-7 shrink-0" aria-hidden />
            )}
            <span className="font-medium text-foreground">{node.name}</span>
            {isBrand && (node.category_count ?? 0) > 0 ? (
              <Badge variant="secondary" className="font-normal">
                {t("categoryCount", { count: node.category_count ?? 0 })}
              </Badge>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Button
            type="button"
            onClick={() =>
              onSelectScope({
                brandId,
                brandName,
                categoryId: isBrand ? null : node.id,
                categoryName: isBrand ? undefined : node.name,
              })
            }
          >
            {t("selectBusinessGroup")}
          </Button>
        </TableCell>
        <TableCell className="text-center">
          {defined ? (
            <Badge className="border-green-600/30 bg-green-600/10 text-xs font-normal text-green-700 dark:text-green-400">
              {t("statusDefined")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              {t("statusUndefined")}
            </Badge>
          )}
        </TableCell>
      </TableRow>
      {hasChildren && isOpen
        ? node.children.map((child) => (
            <NodeRows
              key={child.id}
              node={child}
              depth={depth + 1}
              brandId={brandId}
              brandName={brandName}
              expanded={expanded}
              toggle={toggle}
              onSelectScope={onSelectScope}
              scopeDefined={scopeDefined}
            />
          ))
        : null}
    </Fragment>
  );
}

export function OrderCompareTreeTable({
  brands,
  onSelectScope,
  scopeDefined,
}: Props) {
  const t = useTranslations("orderCompare");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colBrandCategory")}</TableHead>
            <TableHead className="text-center">{t("colSetDiscount")}</TableHead>
            <TableHead className="text-center">{t("colStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.map((brand) => (
            <NodeRows
              key={brand.id}
              node={brand}
              depth={0}
              brandId={brand.id}
              brandName={brand.name}
              expanded={expanded}
              toggle={toggle}
              onSelectScope={onSelectScope}
              scopeDefined={scopeDefined}
              isBrand
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
