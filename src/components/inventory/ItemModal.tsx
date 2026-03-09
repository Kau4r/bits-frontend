import { Download, Printer } from "lucide-react";
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

// Utility function to format date as dd/mm/yyyy
const formatDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return "N/A";
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "N/A";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "N/A";
  }
};

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
  const labelRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadQRCode = async () => {
    const svgEl = document.getElementById("qrCode");
    if (!svgEl || !(svgEl instanceof SVGSVGElement)) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create label with QR + Asset Code + Date (same format as print)
    const scale = 3;
    const width = 1650;
    const height = 400;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, width, height);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();

    await new Promise((resolve) => {
      img.onload = () => {
        // QR code size and position
        const qrSize = 300;
        const qrX = 80;
        const qrY = (height - qrSize) / 2;

        // Draw QR code
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // Text position
        const textX = qrX + qrSize + 100;
        const centerY = height / 2;

        // Draw Asset Code label
        ctx.fillStyle = "#9ca3af";
        ctx.font = "28px Arial";
        ctx.fillText("Asset Code:", textX, centerY - 60);

        // Draw Asset Code value
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 48px monospace";
        ctx.fillText(item?.Item_Code || "Not Available", textX, centerY - 10);

        // Draw Created label
        ctx.fillStyle = "#9ca3af";
        ctx.font = "24px Arial";
        ctx.fillText("Created:", textX, centerY + 50);

        // Draw Created date
        ctx.fillStyle = "#ffffff";
        ctx.font = "28px monospace";
        ctx.fillText(formatDate(item?.Updated_At), textX, centerY + 90);

        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });

    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `label-${item?.Item_Code || formData.serialNumber || "item"}.png`;
    downloadLink.click();
  };

  const handlePrintLabel = async () => {
    const labelElement = labelRef.current;
    if (!labelElement) return;

    // Create a canvas to render the entire label
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Smaller print size - about half of letter size width
    const scale = 3;
    const width = 800; // Smaller width for compact label
    const height = 250; // Proportional height
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, width, height);

    // Get QR code SVG
    const svgEl = document.getElementById("qrCode");
    if (svgEl && svgEl instanceof SVGSVGElement) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const qrImg = new Image();

      await new Promise((resolve) => {
        qrImg.onload = () => {
          // QR code size and position (centered vertically, left aligned)
          const qrSize = 180;
          const qrX = 40;
          const qrY = (height - qrSize) / 2;

          // Draw QR code on the left
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // Text starts after QR code with some padding
          const textX = qrX + qrSize + 50;
          const centerY = height / 2;

          // Draw Asset Code label
          ctx.fillStyle = "#9ca3af";
          ctx.font = "18px Arial";
          ctx.fillText("Asset Code:", textX, centerY - 40);

          // Draw Asset Code value
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 32px monospace";
          ctx.fillText(item?.Item_Code || "Not Available", textX, centerY - 5);

          // Draw Created label
          ctx.fillStyle = "#9ca3af";
          ctx.font = "16px Arial";
          ctx.fillText("Updated:", textX, centerY + 35);

          // Draw Created date
          ctx.fillStyle = "#ffffff";
          ctx.font = "20px monospace";
          ctx.fillText(formatDate(item?.Updated_At), textX, centerY + 60);

          URL.revokeObjectURL(url);
          resolve(null);
        };
        qrImg.src = url;
      });
    }

    const pngUrl = canvas.toDataURL("image/png");

    // Trigger print dialog with smaller label
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Label - ${item?.Item_Code || "Item"}</title>
            <style>
              @page { 
                size: auto;
                margin: 0.5in;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body { 
                margin: 0; 
                padding: 20px;
                display: flex;
                justify-content: flex-start;
                align-items: flex-start;
                min-height: 100vh;
                background: white;
              }
              img { 
                max-width: 600px;
                height: auto;
                display: block;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                img {
                  max-width: 600px;
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <img src="${pngUrl}" alt="Asset Label" />
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                }, 250);
              };
              window.onafterprint = () => {
                setTimeout(() => window.close(), 100);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!isOpen) return null;

  const readOnly = mode === "view";
  const modeTitle = mode === "add" ? "Add Item" : mode === "edit" ? "Edit Item" : "View Item";
  const showAssetInfo = (mode === "view" || mode === "edit") && item;

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
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
            {/* QR Code with Asset Info for View/Edit */}
            {showAssetInfo && formData.serialNumber && (
              <div
                ref={labelRef}
                id="printable-label"
                className="flex items-center justify-between gap-6 mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {/* QR Code */}
                <div className="flex-shrink-0">
                  <ReactQRCode
                    id="qrCode"
                    value={formData.serialNumber}
                    size={120}
                    level="H"
                    bgColor="#1f2937"
                    fgColor="#fff"
                  />
                </div>

                {/* Asset Information */}
                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Asset Code:
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                      {item?.Item_Code || "Not Available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Updated:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {formatDate(item?.Updated_At)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadQRCode}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintLabel}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    Print Label
                  </button>
                </div>
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