import { useEffect, useState } from "react";
import { ArrowLeft, Box, CalendarClock, Loader2, MapPin, ShieldCheck, WifiOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getInventoryByCode } from "@/services/inventory";
import type { Computer, Item } from "@/types/inventory";
import { statusColors } from "@/types/inventory";

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
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 break-words text-lg font-semibold text-slate-950 dark:text-white">{value}</p>
  </div>
);

export default function InventoryItemInfoPage() {
  const { itemCode } = useParams();
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [item, setItem] = useState<Item | null>(null);

  const decodedItemCode = itemCode ? decodeParam(itemCode) : "";

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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/inventory", { replace: true });
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
        <section className="overflow-hidden rounded-[2rem] border border-indigo-200 bg-slate-950 text-white shadow-2xl shadow-indigo-950/20 dark:border-indigo-500/30">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.55),_transparent_38%),linear-gradient(135deg,_#111827,_#1e1b4b)] p-6">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                <Box className="h-8 w-8 text-indigo-100" />
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[item.Status] ?? "bg-slate-100 text-slate-900"}`}>
                {item.Status}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Inventory Item</p>
            <h1 className="mt-2 break-words text-3xl font-black tracking-tight">{item.Item_Code}</h1>
            <p className="mt-2 text-sm text-indigo-100">{item.Brand || "No brand"} - {item.Item_Type || "No type"}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow label="Item Code" value={item.Item_Code || "Not available"} />
          <InfoRow label="Item Type" value={item.Item_Type || "Not available"} />
          <InfoRow label="Brand" value={item.Brand || "Not available"} />
          <InfoRow label="Serial Number" value={item.Serial_Number || "Not available"} />
          <InfoRow label="Status" value={item.Status || "Not available"} />
          <InfoRow label="Borrowable" value={Boolean(item.IsBorrowable) ? "Yes" : "No"} />
        </section>

        <section className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Location</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{item.Location || item.Room?.Name || "Unassigned"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Updated</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{formatDateTime(item.Updated_At)}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>This QR lookup is read-only and available only to Lab Tech and Lab Head accounts.</p>
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
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {renderState()}
      </div>
    </main>
  );
}
