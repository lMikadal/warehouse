import {
  handleTicketCreate,
  handleTicketListGet,
} from "@/lib/bff-order-ticket-handlers";

export async function GET(request: Request) {
  return handleTicketListGet(request);
}

export async function POST(request: Request) {
  return handleTicketCreate(request);
}
