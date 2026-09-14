import {
  handleSystemLanguageDelete,
  handleSystemLanguageGet,
  handleSystemLanguagePatch,
} from "@/lib/bff-system-language-handlers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSystemLanguageGet(request, id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSystemLanguagePatch(request, id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSystemLanguageDelete(request, id);
}
