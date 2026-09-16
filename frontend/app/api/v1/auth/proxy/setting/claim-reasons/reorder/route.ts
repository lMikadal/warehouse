import { handleSettingLangReorder } from "@/lib/bff-setting-handlers";

const SEGMENT = "claim-reasons" as const;

export async function PATCH(request: Request) {
  return handleSettingLangReorder(request, SEGMENT);
}
