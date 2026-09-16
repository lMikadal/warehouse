import { handleSettingLangReorder } from "@/lib/bff-setting-handlers";

const SEGMENT = "sale-channels" as const;

export async function PATCH(request: Request) {
  return handleSettingLangReorder(request, SEGMENT);
}
