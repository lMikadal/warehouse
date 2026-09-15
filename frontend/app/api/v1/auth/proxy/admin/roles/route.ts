import {
  handleAdminRoleCreate,
  handleAdminRolesListGet,
} from "@/lib/bff-admin-handlers";

export async function GET(request: Request) {
  return handleAdminRolesListGet(request);
}

export async function POST(request: Request) {
  return handleAdminRoleCreate(request);
}
