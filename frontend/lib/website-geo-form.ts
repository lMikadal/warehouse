export type WebsiteGeoFormValue = {
  website_province_id: string;
  website_province_name: string;
  website_district_id: string;
  website_district_name: string;
  website_sub_district_id: string;
  website_sub_district_name: string;
  postcode: string;
};

export type WebsiteGeoResource = "provinces" | "districts" | "sub-districts";

export function emptyWebsiteGeo(): WebsiteGeoFormValue {
  return {
    website_province_id: "",
    website_province_name: "",
    website_district_id: "",
    website_district_name: "",
    website_sub_district_id: "",
    website_sub_district_name: "",
    postcode: "",
  };
}
