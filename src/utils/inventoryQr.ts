const INVENTORY_ITEM_PATH = "/inventory/item/";
const DEFAULT_ORIGIN = "https://bits.dcism.org";
// Bundled items (e.g., mouse+keyboard) can share a serial number, so we pair
// the item code with the serial in the QR payload to disambiguate.
const SERIAL_PARAM = "sn";

const getOrigin = () =>
  typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : DEFAULT_ORIGIN;

const appendSerial = (base: string, serialNumber?: string | null) => {
  const trimmed = (serialNumber ?? "").trim();
  if (!trimmed) return base;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${SERIAL_PARAM}=${encodeURIComponent(trimmed)}`;
};

export const buildInventoryItemQrUrl = (
  itemCode: string,
  serialNumber?: string | null,
) =>
  appendSerial(
    `${getOrigin()}${INVENTORY_ITEM_PATH}${encodeURIComponent(itemCode)}`,
    serialNumber,
  );

export const buildInventoryItemPath = (
  itemCode: string,
  serialNumber?: string | null,
) =>
  appendSerial(
    `${INVENTORY_ITEM_PATH}${encodeURIComponent(itemCode)}`,
    serialNumber,
  );

export const parseInventoryQrValue = (value: string) => {
  const rawValue = value.trim();

  if (!rawValue) {
    return { rawValue, itemCode: "", serialNumber: "", isItemUrl: false };
  }

  try {
    const url = new URL(rawValue, getOrigin());

    if (url.pathname.startsWith(INVENTORY_ITEM_PATH)) {
      const encodedItemCode = url.pathname.slice(INVENTORY_ITEM_PATH.length).split("/")[0] ?? "";
      return {
        rawValue,
        itemCode: decodeURIComponent(encodedItemCode),
        serialNumber: url.searchParams.get(SERIAL_PARAM) ?? "",
        isItemUrl: Boolean(encodedItemCode),
      };
    }
  } catch {
    // Raw legacy QR values are still supported below.
  }

  return { rawValue, itemCode: rawValue, serialNumber: "", isItemUrl: false };
};
