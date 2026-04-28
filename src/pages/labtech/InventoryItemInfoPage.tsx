import { useEffect, useState } from "react";
import { ArrowLeft, Box, CalendarClock, Edit3, Loader2, MapPin, Save, ShieldCheck, WifiOff, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getInventoryByCode, updateInventoryItem } from "@/services/inventory";
import { getRooms } from "@/services/room";
import type { Computer, Item } from "@/types/inventory";
import { inventoryStatuses, statusColors } from "@/types/inventory";
import type { Room } from "@/types/room";
import { useAuth } from "@/context/AuthContext";
import { FloatingSelect } from "@/ui/FloatingSelect";
import { isLabStaffRole } from "@/types/user";
import { formatItemType } from "@/lib/utils";

type LoadState = "loading" | "loaded" | "not-found" | "error";

const isItem = (value: Item | Computer): value is Item => "Item_Code" in value;

const decodeParam = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(date);
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 break-words text-lg font-semibold text-slate-950 dark:text-white">{value}</p>
  </div>
);

type ItemFormData = {
  Item_Type: string;
  Brand: string;
  Serial_Number: string;
  Status: Item["Status"];
  Location: string;
  Room_ID: number;
  IsBorrowable: boolean;
};

const toFormData = (item: Item, rooms: Room[]): ItemFormData => ({
  Item_Type: item.Item_Type || "OTHER",
  Brand: item.Brand || "",
  Serial_Number: item.Serial_Number || "",
  Status: item.Status || "AVAILABLE",
  Location: "",
  Room_ID: item.Room_ID || rooms[0]?.Room_ID || 0,
  IsBorrowable: Boolean(item.IsBorrowable),
});

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

export default function InventoryItemInfoPage() {
  const { itemCode } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [item, setItem] = useState<Item | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [formData, setFormData] = useState<ItemFormData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const decodedItemCode = itemCode ? decodeParam(itemCode) : "";
  const canEdit = isLabStaffRole(userRole);

  useEffect(() => {
    if (!decodedItemCode) {
      setLoadState("not-found");
      return;
    }

    let isMounted = true;

    const loadItem = async () => {
      setLoadState("loading");
      try {
        const result = await getInventoryByCode(decodedItemCode);

        if (!isItem(result)) {
          if (!isMounted) return;
          setLoadState("not-found");
          return;
        }

        if (isMounted) {
          setItem(result);
          setLoadState("loaded");
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (isMounted) {
          setLoadState(status === 404 ? "not-found" : "error");
        }
      }
    };

    loadItem();

    return () => {
      isMounted = false;
    };
  }, [decodedItemCode]);

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      try {
        const roomData = await getRooms();
        if (isMounted) setRooms(roomData);
      } catch (error) {
        console.error("Failed to load rooms for QR item editor:", error);
      }
    };

    loadRooms();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (item) setFormData(toFormData(item, rooms));
  }, [item, rooms]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/inventory", { replace: true });
  };

  const beginEdit = () => {
    if (!item || !canEdit) return;
    setFormData(toFormData(item, rooms));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (item) setFormData(toFormData(item, rooms));
    setIsEditing(false);
  };

  const saveItem = async () => {
    if (!item?.Item_ID || !formData) return;
    if (!formData.Item_Type.trim()) {
      toast.error("Item type is required");
      return;
    }
    if (!formData.Brand.trim()) {
      toast.error("Brand is required");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateInventoryItem(item.Item_ID, {
        Item_Type: formData.Item_Type.trim().toUpperCase().replace(/[\s-]+/g, "_"),
        Brand: formData.Brand.trim(),
        Serial_Number: formData.Serial_Number.trim(),
        Status: formData.Status,
        Room_ID: formData.Room_ID || undefined,
        IsBorrowable: formData.IsBorrowable,
      });

      if (isItem(updated)) {
        setItem(updated);
        setFormData(toFormData(updated, rooms));
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update QR item lookup:", error);
      toast.error("Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const renderState = () => {
    if (loadState === "loading") {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading item details...</p>
        </div>
      );
    }

    if (loadState === "not-found") {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/80">
          <WifiOff className="h-12 w-12 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Item not found</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              No inventory item matched {decodedItemCode || "this QR code"}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/inventory", { replace: true })}
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
          >
            Back to Inventory
          </button>
        </div>
      );
    }

    if (loadState === "error" || !item) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-red-300 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
          <WifiOff className="h-12 w-12 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Could not load item</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Check your connection and try scanning the QR code again.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <section className="overflow-hidden rounded-lg border border-indigo-200 bg-slate-950 text-white shadow-2xl shadow-indigo-950/20 dark:border-indigo-500/30">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.55),_transparent_38%),linear-gradient(135deg,_#111827,_#1e1b4b)] p-6">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/15">
                <Box className="h-8 w-8 text-indigo-100" />
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[item.Status] ?? "bg-slate-100 text-slate-900"}`}>
                {item.Status}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Inventory Item</p>
            <h1 className="mt-2 break-words text-3xl font-black tracking-tight">{item.Item_Code}</h1>
            <p className="mt-2 text-sm text-indigo-100">{item.Brand || "No brand"} - {formatItemType(item.Item_Type) || "No type"}</p>
          </div>
        </section>

        {isEditing && formData ? (
          <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Item Type</label>
                <input
                  value={formData.Item_Type}
                  onChange={event => setFormData(prev => prev ? { ...prev, Item_Type: event.target.value } : prev)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Brand</label>
                <input
                  value={formData.Brand}
                  onChange={event => setFormData(prev => prev ? { ...prev, Brand: event.target.value } : prev)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Serial Number</label>
                <input
                  value={formData.Serial_Number}
                  onChange={event => setFormData(prev => prev ? { ...prev, Serial_Number: event.target.value } : prev)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Status</label>
                <FloatingSelect
                  id="qr-item-status"
                  value={formData.Status}
                  placeholder="Select status"
                  options={inventoryStatuses.map(status => ({ value: status, label: status }))}
                  onChange={value => setFormData(prev => prev ? { ...prev, Status: value as Item["Status"] } : prev)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Location</label>
                <FloatingSelect
                  id="qr-item-room"
                  value={formData.Room_ID}
                  placeholder="Select location"
                  options={rooms.map(room => ({ value: room.Room_ID, label: room.Name }))}
                  onChange={value => setFormData(prev => prev ? { ...prev, Room_ID: Number(value) } : prev)}
                />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              Borrowable Item
              <input
                type="checkbox"
                checked={formData.IsBorrowable}
                onChange={event => setFormData(prev => prev ? { ...prev, IsBorrowable: event.target.checked } : prev)}
                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveItem()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow label="Item Code" value={item.Item_Code || "Not available"} />
              <InfoRow label="Item Type" value={formatItemType(item.Item_Type) || "Not available"} />
              <InfoRow label="Brand" value={item.Brand || "Not available"} />
              <InfoRow label="Serial Number" value={item.Serial_Number || "Not available"} />
              <InfoRow label="Status" value={item.Status || "Not available"} />
              <InfoRow label="Borrowable" value={Boolean(item.IsBorrowable) ? "Yes" : "No"} />
            </section>

            <section className="grid grid-cols-1 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Location</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{item.Location || item.Room?.Name || "Unassigned"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Updated</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{formatDateTime(item.Updated_At)}</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1">QR lookup is available to Lab Tech and Lab Head accounts. Authorized users can update this item directly.</p>
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={beginEdit}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={handleBack}
            className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {renderState()}
      </div>
    </main>
  );
}
