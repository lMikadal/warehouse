import type { GeoResource } from "@/lib/system-geo-api";

export type SystemGeoPageKey =
  | "adminSystemCountry"
  | "adminSystemProvince"
  | "adminSystemDistrict"
  | "adminSystemSubDistrict";

export type SystemGeoListConfig = {
  resource: GeoResource;
  permModule: "admin";
  permType:
    | "system_country"
    | "system_province"
    | "system_district"
    | "system_sub_district";
  pageKey: SystemGeoPageKey;
  parentColumnLabel?: "country" | "province" | "district";
  showPostcode?: boolean;
  filterLevels?: ("country" | "province" | "district")[];
  createParentKey?:
    | "system_country_id"
    | "system_province_id"
    | "system_district_id";
  parentSelectLabel?: "country" | "province" | "district";
};

export const GEO_COUNTRY_CONFIG: SystemGeoListConfig = {
  resource: "countries",
  permModule: "admin",
  permType: "system_country",
  pageKey: "adminSystemCountry",
};

export const GEO_PROVINCE_CONFIG: SystemGeoListConfig = {
  resource: "provinces",
  permModule: "admin",
  permType: "system_province",
  pageKey: "adminSystemProvince",
  parentColumnLabel: "country",
  filterLevels: ["country"],
  createParentKey: "system_country_id",
  parentSelectLabel: "country",
};

export const GEO_DISTRICT_CONFIG: SystemGeoListConfig = {
  resource: "districts",
  permModule: "admin",
  permType: "system_district",
  pageKey: "adminSystemDistrict",
  parentColumnLabel: "province",
  filterLevels: ["country", "province"],
  createParentKey: "system_province_id",
  parentSelectLabel: "province",
};

export const GEO_SUB_DISTRICT_CONFIG: SystemGeoListConfig = {
  resource: "sub-districts",
  permModule: "admin",
  permType: "system_sub_district",
  pageKey: "adminSystemSubDistrict",
  parentColumnLabel: "district",
  showPostcode: true,
  filterLevels: ["country", "province", "district"],
  createParentKey: "system_district_id",
  parentSelectLabel: "district",
};
