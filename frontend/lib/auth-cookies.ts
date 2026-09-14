export const ACCESS_TOKEN_COOKIE = "warehouse_access_token";
export const REFRESH_TOKEN_COOKIE = "warehouse_refresh_token";
export const LANDING_PATH_COOKIE = "warehouse_landing";
/** One SSR refresh round-trip per expiry window (prevents layout ↔ refresh-redirect loops). */
export const SSR_REFRESH_TRIED_COOKIE = "warehouse_ssr_refresh_tried";

export type AuthUser = {
  id: number;
  username: string;
  type: string;
  admin_role_id?: number | null;
};

export type LoginResponse = {
  landing_path: string;
  user: AuthUser;
};
