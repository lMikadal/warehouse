import type { ProductAttrSegment } from "@/lib/bff-product-handlers";

export type ProductAttributeKind = "category" | "brand" | "car";

export type ProductAttributePageConfig = {
  kind: ProductAttributeKind;
  segment: ProductAttrSegment;
  permType: string;
  pageNs: "productCategory" | "productBrand" | "productCar";
  tree: boolean;
  allowMove: boolean;
};

export const PRODUCT_ATTRIBUTE_PAGES: Record<
  ProductAttributeKind,
  ProductAttributePageConfig
> = {
  category: {
    kind: "category",
    segment: "categories",
    permType: "product_category",
    pageNs: "productCategory",
    tree: true,
    allowMove: true,
  },
  brand: {
    kind: "brand",
    segment: "brands",
    permType: "product_brand",
    pageNs: "productBrand",
    tree: false,
    allowMove: false,
  },
  car: {
    kind: "car",
    segment: "cars",
    permType: "product_car",
    pageNs: "productCar",
    tree: true,
    allowMove: false,
  },
};
