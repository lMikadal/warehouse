import { WarehouseApiError } from "@/lib/warehouse-api";

type MoveErrorT = (key: "moveQuotaFull" | "moveInvalidParent") => string;
type FallbackT = (key: "forbidden") => string;

/** Map warehouse list move API errors to i18n (design warehouse-list-view). */
export function warehouseMoveErrorMessage(
  err: unknown,
  tWh: MoveErrorT,
  tError: FallbackT
): string {
  if (!(err instanceof WarehouseApiError)) {
    return tError("forbidden");
  }
  if (err.code === "zone_quota_exceeded") {
    return tWh("moveQuotaFull");
  }
  if (err.code === "validation_error" || err.code === "invalid_move") {
    return tWh("moveInvalidParent");
  }
  return err.message || tError("forbidden");
}
