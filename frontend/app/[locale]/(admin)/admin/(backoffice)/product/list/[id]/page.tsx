import { ProductListForm } from "../../_shared/product-list-form";

type Props = { params: Promise<{ id: string }> };

export default async function ProductListEditPage({ params }: Props) {
  const { id } = await params;
  const listId = Number(id);
  return <ProductListForm listId={Number.isFinite(listId) ? listId : undefined} />;
}
