"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";

import { PurchaseOrderList } from "./purchase-order-list";
import { PurchaseRefillPanel } from "./purchase-refill-panel";
import { PurchaseTicketList } from "./purchase-ticket-list";

export function PurchasePage() {
  const router = useRouter();
  const tPage = useTranslations("page.orderPurchase");
  const tPo = useTranslations("page.orderPurchase.po");
  const perms = useResourcePermissions("order", "order_purchase");

  const [tab, setTab] = useState("po");
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [editDraftId, setEditDraftId] = useState<number | null>(null);

  return (
    <div className="flex w-full min-w-0 flex-col">
      <CrudPageHeader title={tPage("title")} description={tPage("subtitle")} />
      <Tabs value={tab} onValueChange={setTab} className="w-full gap-0">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b">
          <TabsList
            variant="line"
            className="h-auto w-fit min-w-0 flex-wrap justify-start gap-4 bg-transparent p-0"
          >
            <TabsTrigger value="po">{tPage("tabPurchaseOrders")}</TabsTrigger>
            <TabsTrigger value="tickets">
              {tPage("tabCombinedTickets")}
            </TabsTrigger>
            <TabsTrigger value="refill">
              {tPage("tabRefillWaiting")}
            </TabsTrigger>
          </TabsList>
          {tab === "po" && perms.create ? (
            <div className="shrink-0 pb-1">
              <Button
                type="button"
                className="gap-2"
                onClick={() => router.push("/admin/order/purchase/new")}
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                {tPo("create")}
              </Button>
            </div>
          ) : null}
        </div>

        <TabsContent value="po" className="mt-6">
          <PurchaseOrderList
            refreshEpoch={refreshEpoch}
            onOpenWaitingDraft={(purchaseId) => {
              setEditDraftId(purchaseId);
              setTab("refill");
            }}
          />
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <PurchaseTicketList />
        </TabsContent>

        <TabsContent value="refill" className="mt-6">
          <PurchaseRefillPanel
            editDraftId={editDraftId}
            onEditDraftConsumed={() => setEditDraftId(null)}
            onPurchaseOrderCreated={() => {
              setRefreshEpoch((e) => e + 1);
              setTab("po");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
