import { Download } from "lucide-react";
import ReactQRCode from "react-qr-code";
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { type InventoryItem } from "@/types/inventory";

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem | InventoryItem[]) => void;
  initMode: "add" | "edit" | "view";
  item?: InventoryItem | null;
  items: InventoryItem[];
  rooms: string[];
}

export default function ItemModal({
  isOpen,
  onClose,
  onSave,
  initMode,
  item,
  items,
  rooms,
}: ItemModalProps) {
  const [baseItem, setBaseItem] = useState<InventoryItem>({
    Item_ID: 0,
    Item_Code: "",
    Item_Type: "",
    Brand: "",
    Room_ID: "TEST_ROOM",
    serialNumber: "",
    Status: "AVAILABLE",
    Updated_At: "",
  });

  const [quantity, setQuantity] = useState(0);
  const [brands, setBrands] = useState<string[]>([]);
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [newItemType, setNewItemType] = useState("");
  const [serials, setSerials] = useState<string[]>([""]);
  const [mode, setMode] = useState(initMode);

  // ---------- Extract unique dropdown values ----------
  useEffect(() => {
    if (!items || items.length === 0) return;

    const uniqueBrands = Array.from(
      new Set(items.map((i) => i.Brand).filter(Boolean))
    );
    const uniqueItemTypes = Array.from(
      new Set(items.map((i) => i.Item_Type).filter(Boolean))
    );

    setBrands(uniqueBrands); 1
    setItemTypes(uniqueItemTypes);
  }, [items]);

  // ---------- Initialize modal state ----------
  useEffect(() => {
    if (!isOpen) return;

    if (initMode === "add") {
      setBaseItem({
        Item_ID: 0,
        Item_Code: "",
        Item_Type: "",
        Brand: "",
        Room_ID: "TEST_ROOM",
        serialNumber: "",
        Status: "AVAILABLE",
        Updated_At: "",
      });
      setQuantity(0);
      setSerials([""]);
    } else if ((initMode === "edit" || initMode === "view") && item) {
      setBaseItem(item);
      setQuantity(0);
      setSerials([item.serialNumber || ""]);
    }

    setMode(initMode);
  }, [isOpen, initMode, item]);

  if (!isOpen) return null;

  // ---------- Save ----------
  // const handleSave = () => {
  //   // if (!baseItem.Item_Type || !baseItem.Brand || !baseItem.Room_ID || !baseItem.serialNumber) {
  //   if (!baseItem.Item_Type || !baseItem.Brand || !baseItem.serialNumber) {
  //     alert("Item type, brand, room, and serial number are required.");
  //     return;
  //   }

  //   const now = new Date().toISOString();
  //   const year = new Date().getFullYear();

  //   if (mode === "add") {
  //     const duplicates = items.filter(
  //       (i) =>
  //         i.Item_Type === baseItem.Item_Type &&
  //         i.Brand === baseItem.Brand &&
  //         i.serialNumber === baseItem.serialNumber &&
  //         // i.Room_ID === baseItem.Room_ID
  //     );
  //     if (duplicates.length > 0) {
  //       alert("Item already exists. Cannot add duplicate.");
  //       onClose();
  //       return;
  //     }

  //     const newItems: InventoryItem[] = serials.map((serial, idx) => ({
  //       ...baseItem,
  //       Item_Code: `${baseItem.Item_Type.slice(0, 3).toUpperCase()}-${year}-${idx + 1}`,
  //       serialNumber: serial.trim(),
  //       Updated_At: now,
  //     }));

  //     onSave(newItems);
  //   } else if (mode === "edit") {
  //     const updatedItem: InventoryItem = {
  //       ...baseItem,
  //       Updated_At: now,
  //     };

  //     const existingItem = items.find((i) => i.Item_Code === baseItem.Item_Code);
  //     if (!existingItem) return;

  //     if (
  //       existingItem.Item_Type !== baseItem.Item_Type ||
  //       existingItem.Brand !== baseItem.Brand ||
  //       existingItem.serialNumber !== baseItem.serialNumber ||
  //       existingItem.Status !== baseItem.Status
  //     ) {
  //       // Key fields changed -> replace original
  //       onSave(updatedItem);
  //     } else if (existingItem.Room_ID !== baseItem.Room_ID) {
  //       // Room changed -> append a new item
  //       const count = items.filter((i) =>
  //         i.Item_Code.startsWith(updatedItem.Item_Code)
  //       ).length - 1;
  //       const newRoomItem = {
  //         ...updatedItem,
  //         Item_Code: `${updatedItem.Item_Code}-${count + 1}`,
  //       };
  //       onSave(newRoomItem);
  //     }
  //   }

  //   setMode("view");
  //   setQuantity(0);
  //   setSerials([baseItem.serialNumber || ""]);
  //   onClose();
  // };

  const handleSave = () => {
    if (!baseItem.Item_Type || !baseItem.Brand) {
      alert("Item type and brand are required.");
      return;
    }

    // Bulk add validation
    if (mode === "add") {
      if (quantity > 1) {
        if (serials.some((s) => !s.trim())) {
          alert("All serial numbers are required.");
          return;
        }
      } else {
        if (!baseItem.serialNumber.trim()) {
          alert("Serial number is required.");
          return;w
        }
      }
    }

    const now = new Date().toISOString();
    const year = new Date().getFullYear();
    const safeRoom = baseItem.Room_ID || "TEST_ROOM";

    if (mode === "add") {
      const newItems: InventoryItem[] =
        quantity > 1
          ? serials.map((serial, idx) => ({
            ...baseItem,
            Room_ID: safeRoom,
            Item_Code: `${baseItem.Item_Type.slice(0, 3).toUpperCase()}-${year}-${idx + 1}`,
            serialNumber: serial.trim(),
            Updated_At: now,
          }))
          : [
            {
              ...baseItem,
              Room_ID: safeRoom,
              Item_Code: `${baseItem.Item_Type.slice(0, 3).toUpperCase()}-${year}-1`,
              Updated_At: now,
            },
          ];

      onSave(newItems);
    } else if (mode === "edit") {
      // just update existing item
      const updatedItem: InventoryItem = {
        ...baseItem,
        Updated_At: now,
      };

      onSave([updatedItem]);
    }
  };

  const readOnly = mode === "view";

  // ---------- Quantity / Serials ----------
  const handleQuantityChange = (val: number) => {
    const qty = Math.max(1, val || 1);
    setQuantity(qty);

    if (qty > serials.length) {
      setSerials([...serials, ...Array(qty - serials.length).fill("")]);
    } else if (qty < serials.length) {
      setSerials(serials.slice(0, qty));
    }
  };

  // ---------- CRUD helpers ----------
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
      if (baseItem.Brand === brand) {
        setBaseItem({ ...baseItem, Brand: "" });
      }
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
      if (baseItem.Item_Type === type) {
        setBaseItem({ ...baseItem, Item_Type: "" });
      }
    }
  };

  // ---------- UI ----------
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
          {mode === "add"
            ? "Add Item"
            : mode === "edit"
              ? "Edit Item"
              : "View Item"}
        </h2>

        {/* QR Code Section */}
        {(mode === "view" || mode === "edit") && baseItem.serialNumber && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-start gap-4 my-5">
              <ReactQRCode
                id="qrCode"
                value={baseItem.Item_Code || baseItem.serialNumber}
                size={200}
                level="H"
                bgColor="#101828"
                fgColor="#fff"
              />
              <button
                type="button"
                onClick={() => {
                  const svg = document.getElementById("qrCode") as SVGSVGElement;
                  if (!svg) return;

                  const serializer = new XMLSerializer();
                  const svgString = serializer.serializeToString(svg);

                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  const img = new Image();

                  const svgBlob = new Blob([svgString], {
                    type: "image/svg+xml;charset=utf-8",
                  });
                  const url = URL.createObjectURL(svgBlob);

                  img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);
                    const pngUrl = canvas.toDataURL("image/png");

                    const downloadLink = document.createElement("a");
                    downloadLink.href = pngUrl;
                    downloadLink.download = `${baseItem.Item_Code || baseItem.serialNumber
                      }.png`;
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

        {/* Form Fields */}
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
              value={baseItem.Room_ID || ""}
              onChange={(e) => setBaseItem({ ...baseItem, Room_ID: e.target.value })}
              disabled={readOnly}
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
            >
              <option value="TEST_ROOM">Test Room</option>
              {/* <option value="">Select a room</option> */}
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
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
                setBaseItem({
                  ...baseItem,
                  Status: e.target.value as InventoryItem["Status"],
                })
              }
              disabled={readOnly}
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
            >
              <option>Available</option>
              <option>In Use</option>
              <option>Maintenance</option>
              <option>Defective</option>
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
                onChange={(e) =>
                  handleQuantityChange(parseInt(e.target.value))
                }
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
                    key={`${idx}-${s}`}
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
                value={baseItem.serialNumber ?? ""}
                onChange={(e) =>
                  setBaseItem({ ...baseItem, serialNumber: e.target.value })
                }
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
                if (mode !== "edit") {
                  setBaseItem(item!);
                  setQuantity(1);
                }
                setMode("edit");
              }}
              className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 transition-colors"
            >
              Edit
            </button>
          )}
          {mode !== "view" && (
            <button
              onClick={handleSave}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
