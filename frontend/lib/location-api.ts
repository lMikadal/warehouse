import {
  BffApiError,
  createBffCrudClient,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

export type LocationItem = {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  names?: { th?: string; en?: string };
};

export { BffApiError as LocationApiError };

const client = createBffCrudClient("/api/v1/auth/proxy/location/locations");

export async function fetchLocationList(
  locale: string,
  params: BffStandardListParams
) {
  return client.list<LocationItem>(locale, params);
}

export async function fetchLocationById(locale: string, id: number) {
  return client.getById<LocationItem>(locale, id);
}

export async function createLocation(
  locale: string,
  body: Record<string, unknown>
) {
  return client.create(locale, body);
}

export async function patchLocation(
  locale: string,
  id: number,
  body: Record<string, unknown>
) {
  return client.patchVoid(locale, id, body);
}

export async function deleteLocation(locale: string, id: number) {
  return client.delete(locale, id);
}

export async function reorderLocations(
  locale: string,
  dragId: number,
  targetId: number
) {
  return client.reorder(locale, dragId, targetId);
}

/** Active locations for sidebar merge (server or client). */
export async function fetchActiveLocationsForNav(
  locale: string
): Promise<LocationItem[]> {
  const { items } = await fetchLocationList(locale, {
    page: 1,
    limit: 100,
    isActive: true,
  });
  return items;
}
