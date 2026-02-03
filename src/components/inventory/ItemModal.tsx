import { Download } from "lucide-react";
import ReactQRCode from "react-qr-code";
import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import type { Item, ItemType } from "@/types/inventory";
import type { Room } from "@/types/room";
import { useModal } from "@/context/ModalContext";

// Valid item types from Prisma schema
const ITEM_TYPES: ItemType[] = [
  "HDMI", "VGA", "ADAPTER", "PROJECTOR", "EXTENSION",
  "MOUSE", "KEYBOARD", "MONITOR", "GENERAL", "OTHER"
];

const STATUS_OPTIONS = ["AVAILABLE", "BORROWED", "DEFECTIVE", "LOST", "REPLACED"] as const;

interface FormData {
  itemType: ItemType;
  brand: string;
  roomId: number;
  status: Item["Status"];
  serialNumber: string;
  isBorrowable: boolean;
}

interface ItemModalProps {
  isOpen: boolean;
  initMode: "view" | "edit" | "add";
  item: Item | null;
  items: Item[];
  rooms: Room[];
  onClose: () => void;
  onSave: (
    payload: Item | Omit<Item, "Item_ID" | "Item_Code">[] | { id: number; data: Partial<Item> }
  ) => void;
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
}: ItemModalProps) {
  const modal = useModal();
  const formRef = useRef<HTMLFormElement>(null);

  const [mode, setMode] = useState(initMode);
  const [quantity, setQuantity] = useState(1);
  const [serials, setSerials] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    itemType: "GENERAL",
    brand: "",
    roomId: rooms?.[0]?.Room_ID ?? 0,
    status: "AVAILABLE",
    serialNumber: "",
    isBorrowable: false,
  });

  // Extract unique brands from existing items for suggestions
  const existingBrands = [...new Set(items.map(i => i.Brand).filter(Boolean))];
  const existingTypes = [...new Set(items.map(i => i.Item_Type).filter(Boolean))];

  // Initialize/reset form when modal opens or mode changes
  useEffect(() => {
    if (!isOpen) return;

    if (initMode === "add") {
      setFormData({
        itemType: "GENERAL",
        brand: "",
        roomId: rooms?.[0]?.Room_ID ?? 0,
        status: "AVAILABLE",
        serialNumber: "",
        isBorrowable: false,
      });
      setQuantity(1);
      setSerials([""]);
    } else if ((initMode === "edit" || initMode === "view") && item) {
      setFormData({
        itemType: item.Item_Type || "GENERAL",
        brand: item.Brand || "",
        roomId: item.Room_ID ?? rooms?.[0]?.Room_ID ?? 0,
        status: item.Status || "AVAILABLE",
        serialNumber: item.Serial_Number || "",
        isBorrowable: !!item.IsBorrowable,
      });
      setQuantity(1);
      setSerials([item.Serial_Number || ""]);
    }

    setMode(initMode);
  }, [isOpen, initMode, item, rooms]);

  // Update serials array when quantity changes
  const handleQuantityChange = (val: number) => {
    const qty = Math.max(1, val || 1);
    setQuantity(qty);

    if (qty > serials.length) {
      setSerials([...serials, ...Array(qty - serials.length).fill("")]);
    } else if (qty < serials.length) {
      setSerials(serials.slice(0, qty));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Validation
    if (!formData.itemType || !formData.brand.trim()) {
      await modal.showError("Item Type and Brand are required", "Validation Error");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "edit" && item?.Item_ID) {
        // Update existing item
        const updateData: Partial<Item> = {
          Item_Type: formData.itemType,
          Brand: formData.brand,
          Serial_Number: formData.serialNumber,
          Status: formData.status,
          Room_ID: formData.roomId,
          Updated_At: new Date().toISOString(),
        };
        onSave({ id: item.Item_ID, data: updateData });
      } else if (mode === "add") {
        // Create new items
        let itemsToAdd: Omit<Item, "Item_ID" | "Item_Code">[];

        if (quantity > 1) {
          // Bulk add with multiple serial numbers
          itemsToAdd = serials.map((sn) => ({
            Item_Type: formData.itemType,
            Brand: formData.brand,
            Serial_Number: sn.trim(),
            Status: formData.status,
            Room_ID: formData.roomId,
            Updated_At: new Date().toISOString(),
            IsBorrowable: formData.isBorrowable,
          }));
        } else {
          // Single item
          itemsToAdd = [{
            Item_Type: formData.itemType,
            Brand: formData.brand,
            Serial_Number: formData.serialNumber.trim(),
            Status: formData.status,
            Room_ID: formData.roomId,
            Updated_At: new Date().toISOString(),
            IsBorrowable: formData.isBorrowable,
          }];
        }

        onSave(itemsToAdd);
      }

      // Note: Modal will be closed by parent (InventoryPage.handleSaveItem)
    } catch (error) {
      console.error("Error saving item:", error);
      await modal.showError("Failed to save item. Please try again.", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQRCode = () => {
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
      downloadLink.download = `${formData.serialNumber || "item"}.png`;
      downloadLink.click();

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  if (!isOpen) return null;

  const readOnly = mode === "view";
  const modeTitle = mode === "add" ? "Add Item" : mode === "edit" ? "Edit Item" : "View Item";

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {modeTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* QR Code for View/Edit */}
            {(mode === "view" || mode === "edit") && formData.serialNumber && (
              <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ReactQRCode
                  id="qrCode"
                  value={formData.serialNumber}
                  size={120}
                  level="H"
                  bgColor="#1f2937"
                  fgColor="#fff"
                />
                <button
                  type="button"
                  onClick={handleDownloadQRCode}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            )}

            {/* Form Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Item Type */}
              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Item Type *
                </label>
                <input
                  type="text"
                  list="itemTypes"
                  value={formData.itemType}
                  onChange={(e) => setFormData({ ...formData, itemType: e.target.value as ItemType })}
                  disabled={readOnly}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                  placeholder="Select or type item type..."
                />
                <datalist id="itemTypes">
                  {[...ITEM_TYPES, ...existingTypes.filter(t => !ITEM_TYPES.includes(t as ItemType))].map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>

              {/* Brand */}
              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Brand *
                </label>
                <input
                  type="text"
                  list="brands"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  disabled={readOnly}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                  placeholder="Enter brand name..."
                />
                <datalist id="brands">
                  {existingBrands.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </div>

              {/* Room */}
              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Room
                </label>
                <select
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: Number(e.target.value) })}
                  disabled={readOnly}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
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
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Item["Status"] })}
                  disabled={readOnly}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity (Add mode only) */}
              {mode === "add" && (
                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Serial Number(s) */}
              <div className={`flex flex-col ${mode === "add" ? "" : "sm:col-span-2"}`}>
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {mode === "add" && quantity > 1 ? "Serial Numbers" : "Serial Number"}
                </label>
                {mode === "add" && quantity > 1 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {serials.map((s, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={s}
                        onChange={(e) => {
                          const updated = [...serials];
                          updated[idx] = e.target.value;
                          setSerials(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Serial #${idx + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    disabled={readOnly}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                    placeholder="Enter serial number..."
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            {mode === "view" && (
              <button
                type="button"
                onClick={() => {
                  if (item) {
                    setFormData({
                      itemType: item.Item_Type || "GENERAL",
                      brand: item.Brand || "",
                      roomId: item.Room_ID ?? rooms?.[0]?.Room_ID ?? 0,
                      status: item.Status || "AVAILABLE",
                      serialNumber: item.Serial_Number || "",
                      isBorrowable: !!item.IsBorrowable,
                    });
                  }
                  setMode("edit");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Edit
              </button>
            )}
            {mode !== "view" && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
