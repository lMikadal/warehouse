import {
  handleSettingCodeCreate,
  handleSettingCodeListGet,
} from "@/lib/bff-setting-handlers";

export async function GET(request: Request) {
  return handleSettingCodeListGet(request);
}

export async function POST(request: Request) {
  return handleSettingCodeCreate(request);
}
