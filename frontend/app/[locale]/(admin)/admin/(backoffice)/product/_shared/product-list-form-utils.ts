import type {
  ListItemBody,
  ListItemFileBody,
  ProductListAggregate,
} from "@/lib/product-list-api";
import type { SettingVatItem } from "@/lib/setting-api";
import type { ImageUploadItem } from "@/lib/system-file-api";

export const PRODUCT_ITEM_GALLERY_MAX = 5;

/** Variant form unit picker — design parity: piece / box / set only. */
export const PRODUCT_ITEM_UNITS = ["piece", "box", "set"] as const;

let nextDraftKey = 1;

export function newItemDraftKey(): string {
  return `item-${nextDraftKey++}`;
}

export function emptyItem(open = false): ListItemBody {
  return {
    price: 0,
    price_wholesale: 0,
    price_vat: 0,
    price_wholesale_vat: 0,
    amount_price_wholesale: 0,
    type_price: "manual",
    unit: "piece",
    qty_per_unit: 1,
    minimum_stock: 0,
    is_new: false,
    is_active: true,
    is_stopped: false,
    is_authentic: true,
    promotion: "",
    names: { th: "", en: "" },
    channel_prices: [],
    suppliers: [],
    warehouse_placements: [],
    files: [],
    _open: open,
    _draftKey: newItemDraftKey(),
  };
}

export function variantItemKey(item: ListItemBody, index: number): string {
  if (item._draftKey) return item._draftKey;
  if (item.id != null && item.id > 0) return `id-${item.id}`;
  return `idx-${index}`;
}

export function listSkuPrefix(listSku: string): string {
  const s = String(listSku ?? "").trim();
  if (!s) return "";
  return s.endsWith("-") ? s : `${s}-`;
}

/** Item-only SKU for the suffix input (design: product-list-form.js itemSkuSuffix). */
export function itemSkuSuffix(item: ListItemBody, listSku: string): string {
  const sku = String(item.sku ?? "").trim();
  const prefix = String(listSku ?? "").trim();
  if (!sku) return "";
  if (!prefix) return sku;
  if (sku.toUpperCase() === prefix.toUpperCase()) return "";

  const upperSku = sku.toUpperCase();
  const upperPrefix = prefix.toUpperCase();
  if (upperSku.startsWith(upperPrefix)) {
    let rest = sku.slice(prefix.length);
    if (rest.startsWith("-") || rest.startsWith("_")) rest = rest.slice(1);
    return rest.trim();
  }

  const dashed = listSkuPrefix(prefix);
  if (dashed && upperSku.startsWith(dashed.toUpperCase())) {
    return sku.slice(dashed.length).trim();
  }

  return sku;
}

/** Composed SKU for save/API (design: prefix + "-" + suffix when both set). */
export function composeItemSku(listSku: string, suffix: string): string {
  const prefix = String(listSku ?? "").trim();
  const rawSuffix = String(suffix ?? "").trim();
  if (!rawSuffix) return prefix;
  if (!prefix) return rawSuffix;

  let itemPart = itemSkuSuffix({ sku: rawSuffix } as ListItemBody, prefix);
  if (!itemPart) itemPart = rawSuffix;
  if (itemPart.toUpperCase() === prefix.toUpperCase()) return prefix;

  return `${prefix}-${itemPart}`;
}

export function composedItemSku(listSku: string, suffix: string): string {
  return composeItemSku(listSku, suffix).trim();
}

export function nextVariantSkuSuffix(
  items: ListItemBody[],
  listSku: string,
  excludeDraftKey?: string
): string {
  const used = new Set<string>();
  for (const it of items) {
    if (excludeDraftKey && it._draftKey === excludeDraftKey) continue;
    const s = itemSkuSuffix(it, listSku).trim().toUpperCase();
    if (s) used.add(s);
  }
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  for (let i = 1; i < 1000; i++) {
    const num = String(i);
    if (!used.has(num)) return num;
  }
  return "1";
}

export function isItemSkuTaken(
  items: ListItemBody[],
  listSku: string,
  suffixOrFull: string,
  excludeDraftKey?: string
): boolean {
  const candidate = composedItemSku(
    listSku,
    itemSkuSuffix({ sku: suffixOrFull } as ListItemBody, listSku) ||
      suffixOrFull.trim()
  ).toUpperCase();
  if (!candidate) return false;
  return items.some((it) => {
    if (excludeDraftKey && it._draftKey === excludeDraftKey) return false;
    const existing = composedItemSku(
      listSku,
      itemSkuSuffix(it, listSku)
    ).toUpperCase();
    return existing === candidate;
  });
}

/** At most one alternate-SKU clone may exist in draft before footer save. */
export function hasPendingAlternateClone(items: ListItemBody[]): boolean {
  return items.some(
    (it) =>
      (it.id == null || it.id <= 0) &&
      it.old_product_item_id != null &&
      it.old_product_item_id > 0
  );
}

/** Full SKUs of alternate clones linked to a saved source variant. */
export function alternateSkusForSource(
  source: ListItemBody,
  items: ListItemBody[],
  listSku: string
): string[] {
  const sourceId = source.id;
  if (sourceId == null || sourceId <= 0) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    if (it.old_product_item_id !== sourceId) continue;
    const raw = (it.sku ?? "").trim();
    const display = raw
      ? raw
      : composeItemSku(listSku, itemSkuSuffix(it, listSku)).trim();
    if (!display) continue;
    const key = display.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function cloneListItemBody(
  source: ListItemBody,
  listSku: string,
  newSuffix: string
): ListItemBody {
  const sku = composeItemSku(listSku, newSuffix);
  const {
    id,
    _open,
    _draftKey,
    total_stock,
    warehouse_root_count,
    low_stock,
    files,
    suppliers,
    channel_prices,
    warehouse_placements,
    ...rest
  } = source;
  void id;
  void _open;
  void _draftKey;
  void total_stock;
  void warehouse_root_count;
  void low_stock;
  void warehouse_placements;

  return {
    ...rest,
    sku,
    names: { th: source.names.th, en: source.names.en },
    channel_prices: (channel_prices ?? []).map((p) => ({ ...p })),
    suppliers: (suppliers ?? []).map((s) => ({ ...s })),
    files: sortListItemFiles(files).map((f) => ({
      system_file_id: f.system_file_id,
      sort_order: f.sort_order,
    })),
    warehouse_placements: [],
    old_product_item_id: source.id ?? null,
    _open: true,
    _draftKey: newItemDraftKey(),
  };
}

export type ItemSalesFieldErrors = {
  sku?: string;
  weight?: string;
  nameTh?: string;
  nameEn?: string;
};

export function validateItemSalesFields(
  item: ListItemBody,
  listSku: string,
  requiredMessage: string
): ItemSalesFieldErrors {
  const errors: ItemSalesFieldErrors = {};
  const suffix = itemSkuSuffix(item, listSku);
  const sku = composeItemSku(listSku, suffix).trim();
  if (!sku) errors.sku = requiredMessage;

  const w = item.weight;
  if (w == null || !Number.isFinite(Number(w))) {
    errors.weight = requiredMessage;
  }

  if (!String(item.names?.th ?? "").trim()) {
    errors.nameTh = requiredMessage;
  }
  if (!String(item.names?.en ?? "").trim()) {
    errors.nameEn = requiredMessage;
  }
  return errors;
}

export function hasItemSalesFieldErrors(
  errors: ItemSalesFieldErrors
): boolean {
  return Boolean(
    errors.sku || errors.weight || errors.nameTh || errors.nameEn
  );
}

export function normalizeWarehousePlacements(
  rows: { id?: number | null; bin_id: number }[] | undefined
): { id?: number | null; bin_id: number }[] {
  if (!rows?.length) return [];
  const byBin = new Map<number, { id?: number | null; bin_id: number }>();
  for (const w of rows) {
    if (w.bin_id <= 0) continue;
    const prev = byBin.get(w.bin_id);
    if (!prev) {
      byBin.set(w.bin_id, w);
      continue;
    }
    const keepNew =
      w.id != null &&
      w.id > 0 &&
      (prev.id == null || prev.id <= 0);
    if (keepNew) byBin.set(w.bin_id, w);
  }
  return [...byBin.values()];
}

export function itemHasDuplicateWarehouseBins(item: ListItemBody): boolean {
  const bins = (item.warehouse_placements ?? [])
    .filter((w) => w.bin_id > 0)
    .map((w) => w.bin_id);
  return new Set(bins).size !== bins.length;
}

export function sortListItemFiles(
  files: ListItemFileBody[] | undefined
): ListItemFileBody[] {
  return [...(files ?? [])].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.system_file_id - b.system_file_id
  );
}

export function listItemFileIdsKey(files: ListItemFileBody[] | undefined): string {
  return sortListItemFiles(files)
    .slice(0, PRODUCT_ITEM_GALLERY_MAX)
    .map((f) => f.system_file_id)
    .join(",");
}

export function imageUploadItemsToListItemFiles(
  items: ImageUploadItem[]
): ListItemFileBody[] {
  return items
    .map((it, index) => {
      if (it.kind !== "remote") return null;
      return {
        system_file_id: it.id,
        sort_order: index,
      };
    })
    .filter((f): f is ListItemFileBody => f != null);
}

export function itemDisplayName(
  item: ListItemBody,
  locale: string
): string {
  const th = (item.names?.th ?? "").trim();
  const en = (item.names?.en ?? "").trim();
  if (locale === "en") return en || th || "—";
  return th || en || "—";
}

export function priceInclVat(exVat: number, vatRate: number): number {
  const p = Number(exVat) || 0;
  const v = Number(vatRate) || 0;
  return p * (1 + v / 100);
}

export function priceExFromIncl(inclVat: number, vatRate: number): number {
  const incl = Number(inclVat);
  if (!Number.isFinite(incl)) return 0;
  const v = Number(vatRate) || 0;
  if (v <= -100) return incl;
  return incl / (1 + v / 100);
}

export function marginPct(sellPrice: number, cost: number): string {
  const sell = Number(sellPrice) || 0;
  const c = Number(cost) || 0;
  if (sell <= 0) return "—";
  return (((sell - c) / sell) * 100).toFixed(2);
}

export function supplierNetPrice(row: {
  cost_price: number;
  discount: number;
  discount_type: string;
}): number {
  const cost = Number(row.cost_price) || 0;
  const disc = Number(row.discount) || 0;
  if (row.discount_type === "percent") {
    return cost * (1 - disc / 100);
  }
  return Math.max(0, cost - disc);
}

export function firstSupplierCost(item: ListItemBody): number {
  const s = item.suppliers?.[0];
  if (!s) return 0;
  return supplierNetPrice(s);
}

export type SaleChannelMeta = {
  id: number;
  name: string;
  is_default?: boolean;
  sort_order?: number;
  system_file_id?: number;
};

type ChannelPriceRow = NonNullable<ListItemBody["channel_prices"]>[number];

export function channelRowExIncl(
  row: ChannelPriceRow,
  vatRate: number
): { ex: number; incl: number } {
  const ex = Number(row.price) || 0;
  const incl =
    row.price_vat != null && row.price_vat > 0
      ? row.price_vat
      : priceInclVat(ex, vatRate);
  return { ex, incl };
}

export function channelRowSellForMargin(
  row: ChannelPriceRow,
  vatType: "exclude" | "include",
  vatRate: number
): number {
  const { ex, incl } = channelRowExIncl(row, vatRate);
  return vatType === "include" ? incl : ex;
}

export function channelMarginDisplay(
  row: ChannelPriceRow,
  vatType: "exclude" | "include",
  vatRate: number,
  usedLotCostPerUnit: number | null | undefined
): string {
  if (usedLotCostPerUnit == null) return "—";
  return marginPct(
    channelRowSellForMargin(row, vatType, vatRate),
    usedLotCostPerUnit
  );
}

export function sortChannelPriceRows(
  rows: ChannelPriceRow[],
  channels: SaleChannelMeta[]
): ChannelPriceRow[] {
  const defaultIds = new Set(
    channels.filter((c) => c.is_default).map((c) => c.id)
  );
  const sortById = new Map(channels.map((c) => [c.id, c.sort_order ?? 0]));
  return [...rows].sort((a, b) => {
    const da = defaultIds.has(a.setting_sale_channel_id) ? 0 : 1;
    const db = defaultIds.has(b.setting_sale_channel_id) ? 0 : 1;
    if (da !== db) return da - db;
    const sa = sortById.get(a.setting_sale_channel_id) ?? 0;
    const sb = sortById.get(b.setting_sale_channel_id) ?? 0;
    if (sa !== sb) return sa - sb;
    return a.setting_sale_channel_id - b.setting_sale_channel_id;
  });
}

export function applyDefaultChannelsToItems(
  items: ListItemBody[],
  channels: SaleChannelMeta[]
): ListItemBody[] {
  return items.map((it) => mergeDefaultChannelPrices(it, channels));
}

export function mergeDefaultChannelPrices(
  item: ListItemBody,
  channels: SaleChannelMeta[]
): ListItemBody {
  if (!channels.length) return item;
  const removed = new Set(item._removed_channel_ids ?? []);
  const existing = [...(item.channel_prices ?? [])];
  const have = new Set(existing.map((p) => p.setting_sale_channel_id));
  for (const ch of channels) {
    if (!ch.is_default || removed.has(ch.id) || have.has(ch.id)) continue;
    existing.push({ setting_sale_channel_id: ch.id, price: 0, price_vat: 0 });
    have.add(ch.id);
  }
  return {
    ...item,
    channel_prices: sortChannelPriceRows(existing, channels),
  };
}

export function activeVatRate(vat: SettingVatItem | null): number {
  if (!vat || !vat.is_active) return 0;
  return Number(vat.rate) || 0;
}

export function prepareItemsForSave(
  draft: ProductListAggregate
): ListItemBody[] {
  const prefix = draft.sku;
  return draft.items.map((it) => {
    const suffix = itemSkuSuffix(it, prefix);
    const {
      _open,
      _draftKey,
      _removed_channel_ids,
      total_stock,
      warehouse_root_count,
      low_stock,
      ...rest
    } = it;
    void _open;
    void _draftKey;
    void _removed_channel_ids;
    void total_stock;
    void warehouse_root_count;
    void low_stock;
    const channel_prices = (rest.channel_prices ?? [])
      .filter((p) => p.setting_sale_channel_id > 0)
      .map((p) => ({
        setting_sale_channel_id: p.setting_sale_channel_id,
        price: Number(p.price) || 0,
        price_vat: p.price_vat,
      }));
    return {
      ...rest,
      sku: composeItemSku(prefix, suffix),
      channel_prices,
      warehouse_placements: normalizeWarehousePlacements(rest.warehouse_placements),
    };
  });
}

export function bodyForSave(
  draft: ProductListAggregate
): ProductListAggregate {
  return {
    ...draft,
    factory_codes: draft.factory_codes?.filter((c) => c.trim()) ?? [],
    other_codes: draft.other_codes?.filter((c) => c.trim()) ?? [],
    cars: draft.cars?.filter((c) => c.product_attribute_engine_id > 0) ?? [],
    items: prepareItemsForSave(draft),
  };
}

export function formatStockQty(value: number, locale: string): string {
  return value.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 2,
  });
}

export function packUnitKey(unit: string): string {
  switch (unit) {
    case "box":
      return "packUnitBox";
    case "set":
      return "packUnitSet";
    default:
      return "packUnitPiece";
  }
}

const ITEM_CODE_RANDOM_LEN = 8;
const ITEM_CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function randomItemCodeSuffix(
  length = ITEM_CODE_RANDOM_LEN
): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ITEM_CODE_ALPHABET[bytes[i]! % ITEM_CODE_ALPHABET.length]!;
  }
  return out;
}

export function generateItemBarcode(): string {
  return `ITEM-BC-${randomItemCodeSuffix()}`;
}

export function generateItemQrcode(): string {
  return `ITEM-QR-${randomItemCodeSuffix()}`;
}

// ponytail: self-check itemSkuSuffix / composeItemSku — run: bun -e "import './frontend/...'"
if (process.env.PRODUCT_LIST_SKU_SELF_CHECK === "1") {
  const list = "P-LIST-001";
  const cases: [string, string][] = [
    ["P-ITEM-001-A", "P-ITEM-001-A"],
    ["P-LIST-001-P-ITEM-001-A", "P-ITEM-001-A"],
    ["P-LIST-001- P-ITEM-001-A", "P-ITEM-001-A"],
  ];
  for (const [sku, want] of cases) {
    const got = itemSkuSuffix({ sku } as ListItemBody, list);
    if (got !== want) throw new Error(`suffix ${sku}: got ${got} want ${want}`);
  }
  const composed = composeItemSku(list, "P-ITEM-001-A");
  if (composed !== "P-LIST-001-P-ITEM-001-A") {
    throw new Error(`compose: ${composed}`);
  }
}

if (process.env.PRODUCT_LIST_ITEM_CODE_SELF_CHECK === "1") {
  const suffix = randomItemCodeSuffix();
  if (suffix.length !== ITEM_CODE_RANDOM_LEN) {
    throw new Error(`suffix length: ${suffix.length}`);
  }
  if (!/^[0-9A-Z]+$/.test(suffix)) {
    throw new Error(`suffix charset: ${suffix}`);
  }
  const bc = generateItemBarcode();
  const qr = generateItemQrcode();
  if (!/^ITEM-BC-[0-9A-Z]{8}$/.test(bc)) {
    throw new Error(`barcode format: ${bc}`);
  }
  if (!/^ITEM-QR-[0-9A-Z]{8}$/.test(qr)) {
    throw new Error(`qrcode format: ${qr}`);
  }
}
