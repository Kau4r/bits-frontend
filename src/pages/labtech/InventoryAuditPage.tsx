import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import {
  Check,
  CheckCircle2,
  Circle,
  CameraOff,
  ScanLine,
  X,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Monitor,
  Search as SearchIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { getRooms, getRoomAuditStatus } from '@/services/room';
import { getInventory, checkInventoryItem, uncheckInventoryItem } from '@/services/inventory';
import { getActiveSemester } from '@/services/semesters';
import type { Room } from '@/types/room';
import type { Item } from '@/types/inventory';
import type { Semester, RoomAuditStatus } from '@/types/semester';
import { parseInventoryQrValue } from '@/utils/inventoryQr';
import { formatItemType, resolveItemType } from '@/lib/utils';

interface ItemWithComputers extends Item {
  Computers?: Array<{
    Computer_ID: number;
    Name: string;
    Room_ID?: number;
  }>;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Return the first Computer name associated with an item (if any)
const getItemComputerName = (item: ItemWithComputers): string | null => {
  const pc = item.Computers?.[0];
  return pc?.Name || null;
};

export default function InventoryAuditPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const [items, setItems] = useState<ItemWithComputers[]>([]);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [auditStatus, setAuditStatus] = useState<RoomAuditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [busyPcName, setBusyPcName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scanCooldownRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [roomList, activeSem] = await Promise.all([getRooms(), getActiveSemester()]);
        setRooms(roomList);
        setSemester(activeSem);
      } catch (err) {
        console.error('Failed to load audit page data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isItemCheckedForSemester = useCallback(
    (item: Item): boolean => {
      if (!item.Last_Checked_At) return false;
      if (!semester) return !!item.Last_Checked_At;
      return new Date(item.Last_Checked_At).getTime() >= new Date(semester.Start_Date).getTime();
    },
    [semester],
  );

  const refreshRoomAudit = useCallback(async (roomId: number) => {
    try {
      const [all, status] = await Promise.all([
        getInventory(),
        getRoomAuditStatus(roomId),
      ]);
      const roomItems = (all as ItemWithComputers[]).filter(
        (x): x is ItemWithComputers => 'Item_Type' in x && x.Room_ID === roomId,
      );
      setItems(roomItems);
      setAuditStatus(status);
    } catch (err) {
      console.error('Failed to refresh room audit:', err);
      toast.error('Failed to load room items');
    }
  }, []);

  useEffect(() => {
    if (selectedRoomId === '') {
      setItems([]);
      setAuditStatus(null);
      return;
    }
    refreshRoomAudit(Number(selectedRoomId));
  }, [selectedRoomId, refreshRoomAudit]);

  const markItemChecked = useCallback(
    async (item: Item, opts: { silent?: boolean } = {}) => {
      if (!item.Item_ID) return;
      if (isItemCheckedForSemester(item)) return;
      setBusyItemId(item.Item_ID);
      try {
        const updated = await checkInventoryItem(item.Item_ID);
        setItems(prev => prev.map(i => (i.Item_ID === item.Item_ID ? { ...i, ...updated } : i)));
        if (selectedRoomId !== '') {
          const status = await getRoomAuditStatus(Number(selectedRoomId));
          setAuditStatus(status);
        }
        if (!opts.silent) toast.success(`Checked: ${item.Item_Code || 'item'}`);
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Failed to mark item';
        toast.error(msg);
      } finally {
        setBusyItemId(null);
      }
    },
    [isItemCheckedForSemester, selectedRoomId],
  );

  const markItemUnchecked = useCallback(
    async (item: Item) => {
      if (!item.Item_ID) return;
      if (!isItemCheckedForSemester(item)) return;
      setBusyItemId(item.Item_ID);
      try {
        const updated = await uncheckInventoryItem(item.Item_ID);
        setItems(prev => prev.map(i => (i.Item_ID === item.Item_ID ? { ...i, ...updated } : i)));
        if (selectedRoomId !== '') {
          const status = await getRoomAuditStatus(Number(selectedRoomId));
          setAuditStatus(status);
        }
        toast.success(`Unchecked: ${item.Item_Code || 'item'}`);
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Failed to uncheck item';
        toast.error(msg);
      } finally {
        setBusyItemId(null);
      }
    },
    [isItemCheckedForSemester, selectedRoomId],
  );

  // Mark all (unchecked) items on a given PC as checked
  const markAllOnPc = useCallback(
    async (pcName: string) => {
      const pcItems = items.filter(
        i => getItemComputerName(i) === pcName && !isItemCheckedForSemester(i) && i.Item_ID,
      );
      if (pcItems.length === 0) {
        toast(`No unchecked items on ${pcName}`, { icon: 'ℹ️' });
        return;
      }
      setBusyPcName(pcName);
      let ok = 0;
      for (const it of pcItems) {
        try {
          const updated = await checkInventoryItem(it.Item_ID!);
          setItems(prev => prev.map(x => (x.Item_ID === it.Item_ID ? { ...x, ...updated } : x)));
          ok++;
        } catch (err) {
          console.error('Failed to check item on PC', it.Item_Code, err);
        }
      }
      if (selectedRoomId !== '') {
        const status = await getRoomAuditStatus(Number(selectedRoomId));
        setAuditStatus(status);
      }
      setBusyPcName(null);
      toast.success(`Checked ${ok} item${ok === 1 ? '' : 's'} on ${pcName}`);
    },
    [items, isItemCheckedForSemester, selectedRoomId],
  );

  useEffect(() => {
    if (!scannerOpen || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    (async () => {
      try {
        setScannerError(null);
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (cancelled || !result) return;
            const text = result.getText();
            const last = scanCooldownRef.current.get(text) ?? 0;
            if (Date.now() - last < 2000) return;
            scanCooldownRef.current.set(text, Date.now());
            handleScannedValue(text);
          },
        );
        if (cancelled) controls.stop();
        else scannerControlsRef.current = controls;
      } catch (err: any) {
        setScannerError(err?.message || 'Unable to access camera');
      }
    })();

    return () => {
      cancelled = true;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  const handleScannedValue = useCallback(
    (rawValue: string) => {
      const parsed = parseInventoryQrValue(rawValue);
      const targetCode = parsed.itemCode || rawValue;

      // 1. Try to match an Item_Code
      const itemMatch = items.find(i => i.Item_Code === targetCode);
      if (itemMatch) {
        if (isItemCheckedForSemester(itemMatch)) {
          toast(`Already checked: ${itemMatch.Item_Code}`, { icon: '✅' });
        } else {
          markItemChecked(itemMatch, { silent: false });
        }
        return;
      }

      // 2. Try to match a Computer Name in this room (PC scan batch-checks all its items)
      const pcName = targetCode.trim();
      const pcItems = items.filter(i => getItemComputerName(i) === pcName);
      if (pcItems.length > 0) {
        markAllOnPc(pcName);
        return;
      }

      toast.error(`No matching item or PC for "${targetCode}" in this room`);
    },
    [items, isItemCheckedForSemester, markItemChecked, markAllOnPc],
  );

  const roomOptions = useMemo(
    () => rooms.map(r => ({ value: String(r.Room_ID), label: r.Name })),
    [rooms],
  );

  // Items filtered by search term and sorted with unchecked items first
  const displayedItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? items
      : items.filter(i =>
          [i.Item_Code, i.Brand, i.Item_Type, getItemComputerName(i) || '']
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q)),
        );
    return [...filtered].sort((a, b) => {
      const aChecked = isItemCheckedForSemester(a) ? 1 : 0;
      const bChecked = isItemCheckedForSemester(b) ? 1 : 0;
      if (aChecked !== bChecked) return aChecked - bChecked;
      return (a.Item_Code || '').localeCompare(b.Item_Code || '');
    });
  }, [items, searchTerm, isItemCheckedForSemester]);

  // Group PC items (only PCs that actually have items in this room)
  const pcGroups = useMemo(() => {
    const map = new Map<string, ItemWithComputers[]>();
    for (const it of items) {
      const name = getItemComputerName(it);
      if (!name) continue;
      const arr = map.get(name) || [];
      arr.push(it);
      map.set(name, arr);
    }
    return Array.from(map.entries())
      .map(([name, pcItems]) => ({
        name,
        total: pcItems.length,
        checked: pcItems.filter(isItemCheckedForSemester).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, isItemCheckedForSemester]);

  const progress = auditStatus
    ? { checked: auditStatus.checkedItems, total: auditStatus.totalItems }
    : { checked: items.filter(isItemCheckedForSemester).length, total: items.length };
  const progressPct = progress.total === 0 ? 0 : Math.round((progress.checked / progress.total) * 100);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-gray-50 px-4 py-4 dark:bg-gray-950">
      {/* Header with back arrow */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black text-gray-900 dark:text-white">Inventory Audit</h1>
          <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
            {semester ? `Active semester: ${semester.Name}` : 'No active semester'}
          </p>
        </div>
      </div>

      {/* Room picker */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Room
        </label>
        <FloatingSelect
          id="audit-room-picker"
          value={selectedRoomId === '' ? '' : String(selectedRoomId)}
          placeholder="Pick a room to audit"
          options={roomOptions}
          onChange={v => setSelectedRoomId(v ? Number(v) : '')}
        />
      </div>

      {selectedRoomId !== '' && (
        <>
          {/* Progress */}
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
              <span>
                {progress.checked} / {progress.total} checked
              </span>
              <button
                type="button"
                onClick={() => refreshRoomAudit(Number(selectedRoomId))}
                className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {auditStatus?.allChecked && auditStatus.totalItems > 0 && (
              <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Room audit complete — you can now export this room's report.
              </p>
            )}
            {!semester && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                No active semester is set. Checks will still record.
              </p>
            )}
          </div>

          {/* Scan */}
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            disabled={progress.total === 0}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ScanLine className="h-5 w-5" />
            Scan Item or PC QR
          </button>

          {/* Search */}
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <SearchIcon className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by code, brand, type, or PC"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* PC groups */}
          {pcGroups.length > 0 && (
            <div className="mb-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                PCs in this room
              </p>
              {pcGroups.map(pc => {
                const allDone = pc.total > 0 && pc.checked === pc.total;
                const busy = busyPcName === pc.name;
                return (
                  <div
                    key={pc.name}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 shadow-sm ${
                      allDone
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20'
                        : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Monitor className={`h-4 w-4 flex-shrink-0 ${allDone ? 'text-emerald-500' : 'text-indigo-500'}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{pc.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {pc.checked}/{pc.total} items checked
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => markAllOnPc(pc.name)}
                      disabled={allDone || busy}
                      className="ml-3 flex-shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? '...' : allDone ? 'Done' : 'Check PC'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Items */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Items {searchTerm ? `(${displayedItems.length} filtered)` : ''}
            </p>
            {displayedItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {items.length === 0 ? 'No items assigned to this room.' : 'No items match your search.'}
              </div>
            ) : (
              displayedItems.map(item => {
                const checked = isItemCheckedForSemester(item);
                const busy = busyItemId === item.Item_ID;
                const pcName = getItemComputerName(item);
                return (
                  <div
                    key={item.Item_ID}
                    role="button"
                    tabIndex={busy ? -1 : 0}
                    onClick={() => {
                      if (busy) return;
                      if (checked) {
                        void markItemUnchecked(item);
                      } else {
                        void markItemChecked(item);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (busy) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (checked) {
                          void markItemUnchecked(item);
                        } else {
                          void markItemChecked(item);
                        }
                      }
                    }}
                    className={`flex items-center justify-between rounded-lg border px-3 py-3 shadow-sm transition-colors ${
                      checked
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20'
                        : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                    } ${busy ? 'cursor-wait opacity-80' : 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20'}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {checked ? (
                        <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="h-6 w-6 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                      )}
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-black text-gray-900 dark:text-white">
                          {item.Item_Code || '—'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatItemType(resolveItemType(item.Item_Type))} · {item.Brand || 'no brand'}
                        </p>
                        {pcName && (
                          <p className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                            <Monitor className="h-3 w-3" /> {pcName}
                          </p>
                        )}
                        {checked && item.Last_Checked_At && (
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            Checked {formatDate(item.Last_Checked_At)}
                            {item.Last_Checked_By ? ` by ${item.Last_Checked_By.First_Name}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {busy && (
                      <span className="ml-3 flex-shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                        ...
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between border-b border-gray-800 bg-black/80 px-4 py-3 text-white">
            <h2 className="text-base font-bold">Scan item or PC QR</h2>
            <button
              type="button"
              onClick={() => setScannerOpen(false)}
              className="rounded-full p-2 hover:bg-white/10"
              aria-label="Close scanner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {scannerError && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg bg-red-600/90 px-4 py-3 text-sm text-white">
                <CameraOff className="h-4 w-4" />
                {scannerError}
              </div>
            )}
          </div>
          <div className="border-t border-gray-800 bg-black/80 px-4 py-3 text-center text-xs text-gray-300">
            Scan an item QR to check it, or a PC's QR to check all its items.
            <br />
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Check className="h-3 w-3" /> {progress.checked}
            </span>{' '}
            / {progress.total} checked
          </div>
        </div>
      )}
    </div>
  );
}
