import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, UserRound, Box, Tag } from 'lucide-react';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { formatItemType, resolveItemType } from '@/lib/utils';
import type { Item } from '@/types/inventory';

export interface WalkinBorrowingSubmit {
  borrowerIdentifier: string;
  itemId: number;
  returnDate: string;
  purpose?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: WalkinBorrowingSubmit) => Promise<void> | void;
  availableItems: Item[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateTimeLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fromDateTimeLocal = (s: string) => new Date(s);

const WalkinBorrowingModal: FC<Props> = ({ isOpen, onClose, onSubmit, availableItems }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const [borrowerIdentifier, setBorrowerIdentifier] = useState('');
  const [itemType, setItemType] = useState<string>('');
  const [itemId, setItemId] = useState<number | ''>('');
  const [borrowedAt, setBorrowedAt] = useState(() => toDateTimeLocal(new Date()));
  const [returnAt, setReturnAt] = useState(() =>
    toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [minReturnAt, setMinReturnAt] = useState(() => toDateTimeLocal(new Date()));
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    setBorrowerIdentifier('');
    setItemType('');
    setItemId('');
    setBorrowedAt(toDateTimeLocal(now));
    setReturnAt(toDateTimeLocal(new Date(now.getTime() + 60 * 60 * 1000)));
    setMinReturnAt(toDateTimeLocal(now));
    setPurpose('');
    setError(null);
    setSaving(false);
  }, [isOpen]);

  // Refresh the "min" lower bound every minute so the input can't sit on a stale
  // past value while the user keeps the modal open.
  useEffect(() => {
    if (!isOpen) return;
    const tick = () => setMinReturnAt(toDateTimeLocal(new Date()));
    const t = window.setInterval(tick, 60_000);
    return () => window.clearInterval(t);
  }, [isOpen]);

  // Group available items by their normalized Item_Type
  const itemTypeOptions = useMemo(() => {
    const set = new Set<string>();
    availableItems.forEach(item => {
      if (typeof item.Item_ID === 'number') set.add(resolveItemType(item.Item_Type));
    });
    return Array.from(set).sort().map(t => ({ value: t, label: formatItemType(t) || t }));
  }, [availableItems]);

  const filteredItems = useMemo(() => {
    if (!itemType) return [] as (Item & { Item_ID: number })[];
    return availableItems.filter(
      (i): i is Item & { Item_ID: number } =>
        typeof i.Item_ID === 'number' && resolveItemType(i.Item_Type) === itemType,
    );
  }, [availableItems, itemType]);

  // If the selected item no longer belongs to the chosen type, reset it.
  useEffect(() => {
    if (itemId !== '' && !filteredItems.some(i => i.Item_ID === itemId)) {
      setItemId('');
    }
  }, [itemType, filteredItems, itemId]);

  const itemOptions = useMemo(
    () =>
      filteredItems.map(i => ({
        value: String(i.Item_ID),
        label: `${i.Item_Code || formatItemType(i.Item_Type) || 'Item'} — ${i.Brand || 'no brand'}${i.Serial_Number ? ` · SN ${i.Serial_Number}` : ''}`,
      })),
    [filteredItems],
  );

  const canSubmit = borrowerIdentifier.trim() !== '' && itemType !== '' && itemId !== '' && returnAt.trim() !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || saving) return;

    const returnDate = fromDateTimeLocal(returnAt);
    if (Number.isNaN(returnDate.getTime())) {
      setError('Enter a valid return date/time.');
      return;
    }
    if (returnDate.getTime() <= Date.now()) {
      setError('Return time must be later than the current time.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        borrowerIdentifier: borrowerIdentifier.trim(),
        itemId: Number(itemId),
        returnDate: returnDate.toISOString(),
        purpose: purpose.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      const body = err?.response?.data;
      setError(body?.error || body?.message || err?.message || 'Failed to record walk-in borrowing');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New Borrowing</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {itemTypeOptions.length === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                No borrowable items are currently available. Mark an item as <span className="font-medium">AVAILABLE</span> in inventory before recording a walk-in.
              </div>
            )}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <UserRound className="h-4 w-4" />
                Borrower ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={borrowerIdentifier}
                onChange={e => setBorrowerIdentifier(e.target.value)}
                placeholder="Student ID, username, email, or any identifier"
                required
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Doesn't need to match a registered user. Unknown IDs are logged as walk-in.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Tag className="h-4 w-4" />
                  Item Type <span className="text-red-500">*</span>
                </label>
                <FloatingSelect
                  id="walkin-borrow-item-type"
                  value={itemType}
                  placeholder={itemTypeOptions.length === 0 ? 'No item types available' : 'Select item type'}
                  options={itemTypeOptions}
                  onChange={v => setItemType(v)}
                  disabled={itemTypeOptions.length === 0}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Box className="h-4 w-4" />
                  Specific Item <span className="text-red-500">*</span>
                </label>
                <FloatingSelect
                  id="walkin-borrow-item"
                  value={itemId === '' ? '' : String(itemId)}
                  placeholder={
                    !itemType
                      ? 'Pick an item type first'
                      : itemOptions.length === 0
                        ? 'No available items of this type'
                        : 'Select an available item'
                  }
                  options={itemOptions}
                  onChange={v => setItemId(v ? Number(v) : '')}
                  disabled={!itemType || itemOptions.length === 0}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Clock className="h-4 w-4" />
                  Time Borrowed
                </label>
                <input
                  type="datetime-local"
                  value={borrowedAt}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 cursor-not-allowed dark:border-[#334155] dark:bg-[#0f172a] dark:text-gray-300"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Set automatically to now.</p>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Clock className="h-4 w-4" />
                  Time Returned (expected) <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={returnAt}
                  onChange={e => setReturnAt(e.target.value)}
                  min={minReturnAt}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Defaults to +1 hour. Must be in the future.</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Purpose (optional)
              </label>
              <textarea
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                rows={2}
                placeholder="e.g. Classroom projector for CS-101"
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white resize-none"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Recording...' : 'Record Borrowing'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default WalkinBorrowingModal;
