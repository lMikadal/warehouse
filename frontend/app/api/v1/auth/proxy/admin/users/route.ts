import {
  handleAdminUserCreate,
  handleAdminUsersListGet,
} from "@/lib/bff-admin-handlers";

export async function GET(request: Request) {
  return handleAdminUsersListGet(request);
}

export async function POST(request: Request) {
  return handleAdminUserCreate(request);
}
