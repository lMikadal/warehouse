import {
  handleStoreSalesDelete,
  handleStoreSalesGet,
  handleStoreSalesPatch,
} from "@/lib/bff-order-store-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return handleStoreSalesGet(request, id);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return handleStoreSalesPatch(request, id);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return handleStoreSalesDelete(request, id);
}
