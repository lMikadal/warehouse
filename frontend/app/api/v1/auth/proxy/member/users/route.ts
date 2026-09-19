import {
  handleMemberUserCreate,
  handleMemberUserListGet,
} from "@/lib/bff-member-user-handlers";

export const GET = handleMemberUserListGet;
export const POST = handleMemberUserCreate;
