import { backendFetch } from "@/lib/api-server";
import type { LocationItem } from "@/lib/location-api";

type ListBody = {
  items?: LocationItem[];
};

export async function fetchActiveLocationsForNavServer(
  accessToken: string,
  locale: string
): Promise<LocationItem[]> {
  const res = await backendFetch(
    "/v1/location/locations?page=1&limit=100&is_active=true",
    { accessToken, locale }
  );
  if (!res.ok) return [];
  const body = (await res.json()) as ListBody;
  return body.items ?? [];
}

export async function fetchLocationById(
  accessToken: string,
  locale: string,
  id: number
): Promise<LocationItem | null> {
  const res = await backendFetch(`/v1/location/locations/${id}`, {
    accessToken,
    locale,
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as LocationItem;
}
