import {
  handleMemberTierCreate,
  handleMemberTierListGet,
} from "@/lib/bff-member-tier-handlers";

export async function GET(request: Request) {
  return handleMemberTierListGet(request);
}

export async function POST(request: Request) {
  return handleMemberTierCreate(request);
}
