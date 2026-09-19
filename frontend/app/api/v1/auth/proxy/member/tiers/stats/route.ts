import { handleMemberTierStatsGet } from "@/lib/bff-member-tier-handlers";

export async function GET(request: Request) {
  return handleMemberTierStatsGet(request);
}
