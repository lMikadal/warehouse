import {
  handleMemberSettingCreate,
  handleMemberSettingListGet,
} from "@/lib/bff-member-setting-handlers";

const SEGMENT = "credits" as const;

export async function GET(request: Request) {
  return handleMemberSettingListGet(request, SEGMENT);
}

export async function POST(request: Request) {
  return handleMemberSettingCreate(request, SEGMENT);
}
