const INVENTORY_ITEM_PATH = "/inventory/item/";
const DEFAULT_ORIGIN = "https://bits.dcism.org";

const getOrigin = () =>
  typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : DEFAULT_ORIGIN;

export const buildInventoryItemQrUrl = (itemCode: string) =>
  `${getOrigin()}${INVENTORY_ITEM_PATH}${encodeURIComponent(itemCode)}`;

export const buildInventoryItemPath = (itemCode: string) =>
  `${INVENTORY_ITEM_PATH}${encodeURIComponent(itemCode)}`;

export const parseInventoryQrValue = (value: string) => {
  const rawValue = value.trim();

  if (!rawValue) {
    return { rawValue, itemCode: "", isItemUrl: false };
  }

  try {
    const url = new URL(rawValue, getOrigin());

    if (url.pathname.startsWith(INVENTORY_ITEM_PATH)) {
      const encodedItemCode = url.pathname.slice(INVENTORY_ITEM_PATH.length).split("/")[0] ?? "";
      return {
        rawValue,
        itemCode: decodeURIComponent(encodedItemCode),
        isItemUrl: Boolean(encodedItemCode),
      };
    }
  } catch {
    // Raw legacy QR values are still supported below.
  }

  return { rawValue, itemCode: rawValue, isItemUrl: false };
};
