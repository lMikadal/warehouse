import { handleSystemLanguageReorder } from "@/lib/bff-system-language-handlers";

export async function PATCH(request: Request) {
  return handleSystemLanguageReorder(request);
}
