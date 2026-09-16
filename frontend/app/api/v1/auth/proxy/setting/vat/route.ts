import { handleSettingVatGet } from "@/lib/bff-setting-handlers";

export async function GET(request: Request) {
  return handleSettingVatGet(request);
}
