import {
  handleLocationDelete,
  handleLocationGet,
  handleLocationPatch,
} from "@/lib/bff-location-handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleLocationGet(request, id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleLocationPatch(request, id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleLocationDelete(request, id);
}
