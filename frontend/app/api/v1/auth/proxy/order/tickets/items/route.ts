import { handleTicketItemsGet } from "@/lib/bff-order-ticket-handlers";

export async function GET(request: Request) {
  return handleTicketItemsGet(request);
}
