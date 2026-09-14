import {
  handleSystemGeoDelete,
  handleSystemGeoGet,
  handleSystemGeoPatch,
} from "@/lib/bff-system-geo-handlers";

const RESOURCE = "provinces" as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSystemGeoGet(request, RESOURCE, id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSystemGeoPatch(request, RESOURCE, id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSystemGeoDelete(request, RESOURCE, id);
}
