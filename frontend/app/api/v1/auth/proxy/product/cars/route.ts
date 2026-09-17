import {
  handleProductAttrCreate,
  handleProductAttrListGet,
} from "@/lib/bff-product-handlers";

export async function GET(request: Request) {
  return handleProductAttrListGet(request, "cars");
}

export async function POST(request: Request) {
  return handleProductAttrCreate(request, "cars");
}
