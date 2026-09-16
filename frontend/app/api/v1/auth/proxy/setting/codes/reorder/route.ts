import { handleSettingCodeReorder } from "@/lib/bff-setting-handlers";

export async function PATCH(request: Request) {
  return handleSettingCodeReorder(request);
}
