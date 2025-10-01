import { Download } from "lucide-react";
import ReactQRCode from "react-qr-code";
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import type { Item } from "@/types/inventory";
import type { Room } from "@/types/room";

// Omit Item_Code and Item_ID for new items
type NewInventoryItem = Omit<Item, "Item_Code" | "Item_ID">;

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    item: NewInventoryItem | NewInventoryItem[] | Item | Item[] | { id: number; data: Partial<Item> }
  ) => void;
  initMode: "add" | "edit" | "view";
  item?: Item | null;
  items: Item[];
  rooms: Room[];
  userId?: number;
}

export default function ItemModal({
  isOpen,
  onClose,
  onSave,
  initMode,
  item,
  items,
  rooms,
  userId,
}: ItemModalProps) {
  const [baseItem, setBaseItem] = useState<Item | Omit<Item, 'Item_ID' | 'Item_Code'>>({
    Item_Type: "",
    Brand: "",
    Room_ID: rooms?.[0]?.Room_ID ?? 0,
    Serial_Number: "",
    Status: "AVAILABLE",
    Updated_At: new Date().toISOString(),
    IsBorrowable: false
  });


  const [quantity, setQuantity] = useState(1);
  const [brands, setBrands] = useState<string[]>([]);
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [newItemType, setNewItemType] = useState("");
  const [serials, setSerials] = useState<string[]>([""]);
  const [mode, setMode] = useState(initMode);

  // Extract unique brands and item types
  useEffect(() => {
    if (!items || items.length === 0) return;
    setBrands([...new Set(items.map((i) => i.Brand).filter(Boolean))]);
    setItemTypes([...new Set(items.map((i) => i.Item_Type).filter(Boolean))]);
  }, [items]);

  // Initialize modal state
  useEffect(() => {
    if (!isOpen) return;

    if (initMode === "add") {
      setBaseItem({
        Item_Type: "",
        Brand: "",
        Room_ID: rooms?.[0]?.Room_ID ?? 0,
        Serial_Number: "",
        Status: "AVAILABLE",
        Updated_At: new Date().toISOString(),
        IsBorrowable: false,
      });
      setQuantity(1);
      setSerials([""]);
    } else if ((initMode === "edit" || initMode === "view") && item) {
      setBaseItem(item as NewInventoryItem);
      setQuantity(1);
      setSerials([item.Serial_Number || ""]);
    }

    setMode(initMode);
  }, [isOpen, initMode, item, rooms]);

  if (!isOpen) return null;

  const readOnly = mode === "view";

  const handleSave = () => {
    if (!baseItem.Item_Type || !baseItem.Brand) return;

    const safeRoomId = baseItem.Room_ID ?? rooms?.[0]?.Room_ID ?? 0;

    // ItemModal.tsx
    if (mode === "edit" && item) {
      const updatedItem: Partial<Item> = {
        Item_ID: item.Item_ID, // preserve ID
        Item_Type: baseItem.Item_Type,
        Brand: baseItem.Brand,
        Serial_Number: baseItem.Serial_Number,
        Status: baseItem.Status,
        Room_ID: baseItem.Room_ID ?? rooms?.[0]?.Room_ID ?? 0,
        Updated_At: new Date().toISOString(),
      };
      onSave({ id: item.Item_ID, data: updatedItem });
    }

  };


  const handleQuantityChange = (val: number) => {
    const qty = Math.max(1, val || 1);
    setQuantity(qty);

    if (qty > serials.length) setSerials([...serials, ...Array(qty - serials.length).fill("")]);
    else if (qty < serials.length) setSerials(serials.slice(0, qty));
  };

  const addBrand = () => {
    const v = newBrand.trim();
    if (v && !brands.includes(v)) {
      setBrands([...brands, v]);
      setNewBrand("");
    }
  };
  const removeBrand = (brand: string) => {
    if (!brand) return;
    if (confirm(`Delete brand "${brand}"?`)) {
      setBrands((prev) => prev.filter((b) => b !== brand));
      if (baseItem.Brand === brand) setBaseItem({ ...baseItem, Brand: "" });
    }
  };

  const addItemType = () => {
    const v = newItemType.trim();
    if (v && !itemTypes.includes(v)) {
      setItemTypes([...itemTypes, v]);
      setNewItemType("");
    }
  };
  const removeItemType = (type: string) => {
    if (!type) return;
    if (confirm(`Delete item type "${type}"?`)) {
      setItemTypes((prev) => prev.filter((t) => t !== type));
      if (baseItem.Item_Type === type) setBaseItem({ ...baseItem, Item_Type: "" });
    }
  };

  const renderDropdown = (
    label: string,
    value: string,
    options: string[],
    onChange: (val: string) => void,
    onRemove: (val: string) => void,
    newValue: string,
    setNewValue: (val: string) => void,
    onAdd: () => void
  ) => (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium">{label}</label>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className="flex-1 rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onRemove(value)}
            disabled={!value || readOnly}
            className={`rounded px-2 py-1 ${value && !readOnly
              ? "bg-red-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700"
              }`}
          >
            Delete
          </button>
        </div>

        {!readOnly && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`New ${label.toLowerCase()}`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 rounded-md border px-2 py-1 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="button"
              onClick={onAdd}
              className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700 dark:text-white"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold">
          {mode === "add" ? "Add Item" : mode === "edit" ? "Edit Item" : "View Item"}
        </h2>

        {/* QR Code */}
        {(mode === "view" || mode === "edit") && baseItem.Serial_Number && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-start gap-4 my-5">
              <ReactQRCode
                id="qrCode"
                value={baseItem.Serial_Number}
                size={200}
                level="H"
                bgColor="#101828"
                fgColor="#fff"
              />
              <button
                type="button"
                onClick={() => {
                  const svgEl = document.getElementById("qrCode");
                  if (!svgEl || !(svgEl instanceof SVGSVGElement)) return;

                  const serializer = new XMLSerializer();
                  const svgString = serializer.serializeToString(svgEl);

                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  const img = new Image();

                  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                  const url = URL.createObjectURL(svgBlob);

                  img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);
                    const pngUrl = canvas.toDataURL("image/png");

                    const downloadLink = document.createElement("a");
                    downloadLink.href = pngUrl;
                    downloadLink.download = `${baseItem.Serial_Number}.png`;
                    downloadLink.click();

                    URL.revokeObjectURL(url);
                  };

                  img.src = url;
                }}
                className="rounded bg-green-600 px-3 py-1 text-white text-sm"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {renderDropdown(
            "Item Type",
            baseItem.Item_Type,
            itemTypes,
            (v) => setBaseItem({ ...baseItem, Item_Type: v }),
            removeItemType,
            newItemType,
            setNewItemType,
            addItemType
          )}

          {renderDropdown(
            "Brand",
            baseItem.Brand,
            brands,
            (v) => setBaseItem({ ...baseItem, Brand: v }),
            removeBrand,
            newBrand,
            setNewBrand,
            addBrand
          )}

          {/* Room */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium">Room</label>
            <select
              value={baseItem.Room_ID}
              onChange={(e) => setBaseItem({ ...baseItem, Room_ID: Number(e.target.value) })}
              disabled={readOnly}
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
            >
              {rooms.map((r) => (
                <option key={r.Room_ID} value={r.Room_ID}>
                  {r.Name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium">Status</label>
            <select
              value={baseItem.Status}
              onChange={(e) =>
                setBaseItem({ ...baseItem, Status: e.target.value as Item["Status"] })
              }
              disabled={readOnly}
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
            >
              <option value="AVAILABLE">Available</option>
              <option value="BORROWED">Borrowed</option>
              <option value="DEFECTIVE">Defective</option>
              <option value="LOST">Lost</option>
              <option value="REPLACED">Replaced</option>
            </select>
          </div>

          {/* Quantity */}
          {mode === "add" && (
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          {/* Serial Numbers */}
          {mode === "add" && quantity > 1 ? (
            <div className="flex flex-col col-span-2">
              <label className="mb-1 text-sm font-medium">Serial Numbers</label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {serials.map((s, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={s}
                    onChange={(e) => {
                      const next = [...serials];
                      next[idx] = e.target.value;
                      setSerials(next);
                    }}
                    disabled={readOnly}
                    className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
                    placeholder={`Serial #${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col col-span-2">
              <label className="mb-1 text-sm font-medium">Serial Number</label>
              <input
                type="text"
                value={baseItem.Serial_Number ?? ""}
                onChange={(e) => setBaseItem({ ...baseItem, Serial_Number: e.target.value })}
                disabled={readOnly}
                className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => {
              setMode("view");
              onClose();
            }}
            className="rounded bg-gray-300 px-4 py-2 dark:bg-gray-700 dark:text-white"
          >
            Cancel
          </button>
          {mode === "view" && (
            <button
              onClick={() => {
                if (item) setBaseItem(item as NewInventoryItem);
                setQuantity(1);
                setMode("edit");
              }}
              className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 transition-colors"
            >
              Edit
            </button>
          )}
          {mode !== "view" && (
            <button onClick={handleSave} className="rounded bg-blue-600 px-4 py-2 text-white">
              Save
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
