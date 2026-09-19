import { handleMemberBusinessFiltersGet } from "@/lib/bff-member-setting-handlers";

export async function GET(request: Request) {
  return handleMemberBusinessFiltersGet(request);
}
