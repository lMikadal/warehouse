"use client";

import {
  Box,
  ChevronRight,
  ClipboardList,
  Coins,
  Contact,
  LogOut,
  MapPin,
  Package,
  Settings,
  ShieldUser,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { BreadcrumbNav, type BreadcrumbSegment } from "@/components/molecules/breadcrumb-nav";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { LocaleThemeToolbar } from "@/components/molecules/locale-theme-toolbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLocalizedPathname } from "@/hooks/use-localized-pathname";
import { Link } from "@/i18n/navigation";
import { logoutAndRedirectToLogin } from "@/lib/auth-client";
import {
  adminNavLabel,
  breadcrumbFromNavTree,
  filterAdminNavTree,
  type AdminNavIcon,
  type AdminNavNode,
} from "@/lib/admin-nav-api";
import type { AuthUser } from "@/lib/auth-cookies";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<AdminNavIcon, LucideIcon> = {
  "shield-user": ShieldUser,
  "user-round": UserRound,
  settings: Settings,
  contact: Contact,
  "map-pin": MapPin,
  warehouse: Warehouse,
  box: Box,
  package: Package,
  users: Users,
  coins: Coins,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  "clipboard-list": ClipboardList,
};

/** Design: `.sidebar-nav__sub` — left guide line for nested nav (design/css/style.css) */
const SIDEBAR_SUB_LIST_CLASS = cn(
  "mx-0 flex min-w-0 flex-col gap-0.5 border-l-2 border-primary/15 py-0.5 pl-2.5",
  "ml-6 dark:border-primary/20",
);

export type AdminBackofficeShellProps = {
  children: ReactNode;
  navTree: AdminNavNode[];
  user: Pick<AuthUser, "username">;
  breadcrumbSegments?: BreadcrumbSegment[];
};

function AdminLogoutButton() {
  const t = useTranslations();

  async function onLogout() {
    await logoutAndRedirectToLogin({ callbackUrl: null });
  }

  return (
    <ButtonIcon
      type="button"
      variant="outline"
      className="shrink-0 text-destructive"
      aria-label={t("nav.logout")}
      onClick={() => void onLogout()}
    >
      <LogOut className="text-current" />
    </ButtonIcon>
  );
}

function userInitial(username: string): string {
  const s = username.trim();
  return s ? s.charAt(0).toUpperCase() : "?";
}

function NavIcon({ icon }: { icon?: AdminNavIcon }) {
  if (!icon) return null;
  const Icon = NAV_ICONS[icon];
  if (!Icon) return null;
  return <Icon className="text-current" aria-hidden />;
}

type NavRenderContext = {
  pathname: string;
  locale: string;
  depth: number;
  navSearchActive: boolean;
};

function AdminNavCollapsible({
  node,
  ctx,
  className,
  children,
}: {
  node: AdminNavNode;
  ctx: NavRenderContext;
  className?: string;
  children: ReactNode;
}) {
  const branchOpen = navCollapsibleDefaultOpen(node, ctx);
  const [open, setOpen] = useState(branchOpen);

  useEffect(() => {
    if (ctx.navSearchActive) {
      setOpen(true);
      return;
    }
    setOpen(branchOpen);
  }, [ctx.navSearchActive, branchOpen]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      {children}
    </Collapsible>
  );
}

function navBranchContainsActivePath(
  node: AdminNavNode,
  pathname: string
): boolean {
  if (isPathActive(pathname, node.href)) return true;
  return (node.children ?? []).some((c) =>
    navBranchContainsActivePath(c, pathname)
  );
}

function navCollapsibleDefaultOpen(
  node: AdminNavNode,
  ctx: NavRenderContext
): boolean {
  if (ctx.navSearchActive) return true;
  if (node.defaultOpen) return true;
  return navBranchContainsActivePath(node, ctx.pathname);
}

function isPathActive(pathname: string, href: string | undefined): boolean {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavSubTree({
  nodes,
  ctx,
}: {
  nodes: AdminNavNode[];
  ctx: NavRenderContext;
}) {
  return (
    <>
      {nodes.map((node) => (
        <AdminNavNodeView key={node.id} node={node} ctx={ctx} />
      ))}
    </>
  );
}

function AdminNavNodeView({
  node,
  ctx,
}: {
  node: AdminNavNode;
  ctx: NavRenderContext;
}) {
  const label = adminNavLabel(node.labels, ctx.locale);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const active = isPathActive(ctx.pathname, node.href);

  if (hasChildren && ctx.depth === 0) {
    return (
      <AdminNavCollapsible node={node} ctx={ctx} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger
            nativeButton
            render={
              <SidebarMenuButton tooltip={label} className="font-normal"/>
            }
          >
            <NavIcon icon={node.icon} />
            <span>{label}</span>
            <ChevronRight className="ml-auto text-current transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className={SIDEBAR_SUB_LIST_CLASS}>
              <AdminNavSubTree
                nodes={node.children!}
                ctx={{ ...ctx, depth: ctx.depth + 1 }}
              />
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </AdminNavCollapsible>
    );
  }

  if (hasChildren) {
    return (
      <AdminNavCollapsible node={node} ctx={ctx} className="group/collapsible">
        <SidebarMenuSubItem>
          <CollapsibleTrigger
            nativeButton={false}
            render={
              <SidebarMenuSubButton className="font-normal" size="md" />
            }
          >
            <span>{label}</span>
            <ChevronRight className="ml-auto size-4 text-current transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className={cn(SIDEBAR_SUB_LIST_CLASS, "ml-3")}>
              <AdminNavSubTree
                nodes={node.children!}
                ctx={{ ...ctx, depth: ctx.depth + 1 }}
              />
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuSubItem>
      </AdminNavCollapsible>
    );
  }

  if (ctx.depth === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={active}
          tooltip={label}
          disabled={!node.href}
          render={node.href ? <Link href={node.href} /> : undefined}
        >
          <NavIcon icon={node.icon} />
          <span>{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={active}
        size="md"
        aria-disabled={!node.href}
        className={cn(!node.href && "pointer-events-none opacity-60")}
        render={node.href ? <Link href={node.href} /> : undefined}
      >
        <span>{label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

export function AdminBackofficeShell({
  children,
  navTree,
  user,
  breadcrumbSegments,
}: AdminBackofficeShellProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = useLocalizedPathname();
  const [navQuery, setNavQuery] = useState("");

  const filteredTree = useMemo(
    () => filterAdminNavTree(navTree, navQuery, locale),
    [navTree, navQuery, locale],
  );

  const segments = useMemo((): BreadcrumbSegment[] => {
    if (breadcrumbSegments) return breadcrumbSegments;
    return breadcrumbFromNavTree(pathname, navTree).map((seg) => ({
      label: adminNavLabel(seg.labels, locale),
      href: seg.href,
    }));
  }, [breadcrumbSegments, pathname, locale, navTree]);

  const navSearchActive = navQuery.trim().length > 0;

  const navCtx: NavRenderContext = {
    pathname,
    locale,
    depth: 0,
    navSearchActive,
  };

  const initial = userInitial(user.username);

  return (
    <SidebarProvider>
      <Sidebar
        collapsible="offcanvas"
        className="border-r border-sidebar-border"
      >
        <SidebarHeader className="gap-3 p-4 pb-2">
          <div className="flex items-center gap-2.5 px-1">
            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <Warehouse className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight">
              {t("app.name")}
            </span>
          </div>
          <SidebarSeparator className="mx-0" />
          <label className="sr-only" htmlFor="admin-sidebar-search">
            {t("nav.search")}
          </label>
          <CrudSearchField
            id="admin-sidebar-search"
            value={navQuery}
            onChange={setNavQuery}
            className="min-w-0 w-full flex-1"
          />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="p-2 pt-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredTree.length === 0 ? (
                  <p className="text-muted-foreground text-center px-2 py-3 text-sm">
                    {t("nav.noMenu")}
                  </p>
                ) : (
                  filteredTree.map((node) => (
                    <AdminNavNodeView key={node.id} node={node} ctx={navCtx} />
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {user.username}
            </span>
            <AdminLogoutButton />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-page-wash min-h-svh">
        <header
          className={cn(
            "sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-sm",
          )}
        >
          <SidebarTrigger aria-label={t("nav.openMenu")} />
          <div className="min-w-0 flex-1">
            <BreadcrumbNav segments={segments} />
          </div>
          <LocaleThemeToolbar />
        </header>

        <div className="mx-auto w-full max-w-crud-page flex-1 px-admin-content py-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
