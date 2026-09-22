"use client";

import { use } from "react";

import { PurchaseTicketReceiveForm } from "../../_shared/purchase-ticket-receive-form";

type Props = { params: Promise<{ id: string }> };

export default function PurchaseTicketReceivePage({ params }: Props) {
  const { id } = use(params);
  const ticketId = Number(id);
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    return null;
  }
  return <PurchaseTicketReceiveForm ticketId={ticketId} />;
}
