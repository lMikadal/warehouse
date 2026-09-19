import {
  handleMemberUserDiscountDelete,
  handleMemberUserDiscountPatch,
} from "@/lib/bff-member-user-handlers";

type Ctx = { params: Promise<{ id: string; discountId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, discountId } = await ctx.params;
  return handleMemberUserDiscountPatch(request, id, discountId);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id, discountId } = await ctx.params;
  return handleMemberUserDiscountDelete(request, id, discountId);
}
