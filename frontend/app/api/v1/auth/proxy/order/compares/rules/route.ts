import {
  handleOrderCompareRulesGet,
  handleOrderCompareRulesPut,
} from "@/lib/bff-order-compare-handlers";

export async function GET(request: Request) {
  return handleOrderCompareRulesGet(request);
}

export async function PUT(request: Request) {
  return handleOrderCompareRulesPut(request);
}
