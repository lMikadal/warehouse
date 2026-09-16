import {
  handleSettingLangCreate,
  handleSettingLangListGet,
} from "@/lib/bff-setting-handlers";

const SEGMENT = "claim-reasons" as const;

export async function GET(request: Request) {
  return handleSettingLangListGet(request, SEGMENT);
}

export async function POST(request: Request) {
  return handleSettingLangCreate(request, SEGMENT);
}
