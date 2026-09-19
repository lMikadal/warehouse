import { ProductListForm } from "../../_shared/product-list-form";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; item?: string }>;
};

export default async function ProductListEditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const listId = Number(id);
  const tabRaw = sp.tab?.trim();
  const initialTab =
    tabRaw === "pricing" || tabRaw === "history" || tabRaw === "data"
      ? tabRaw
      : undefined;
  const itemRaw = sp.item?.trim();
  const parsedItem = itemRaw ? Number(itemRaw) : NaN;
  const focusItemId =
    Number.isFinite(parsedItem) && parsedItem > 0 ? parsedItem : undefined;

  return (
    <ProductListForm
      listId={Number.isFinite(listId) ? listId : undefined}
      initialTab={initialTab}
      focusItemId={focusItemId}
    />
  );
}
