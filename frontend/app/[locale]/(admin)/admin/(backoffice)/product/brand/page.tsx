import { ProductAttributePage } from "../_shared/product-attribute-page";
import { PRODUCT_ATTRIBUTE_PAGES } from "../_shared/product-attribute-config";

export default function ProductBrandPage() {
  return <ProductAttributePage config={PRODUCT_ATTRIBUTE_PAGES.brand} />;
}
