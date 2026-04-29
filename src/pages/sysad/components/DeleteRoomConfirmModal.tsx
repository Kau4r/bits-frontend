import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { Room } from '@/types/room';
import { deleteRoom } from '@/services/room';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Props {
  open: boolean;
  room: Room;
  onClose: () => void;
  onSuccess: (room: Room) => void;
}

/**
 * Failsafe delete modal for rooms. Requires the SysAd to type the room name
 * exactly before the confirm button is enabled. Backend additionally blocks
 * deletion when active/future bookings exist for the room.
 */
export default function DeleteRoomConfirmModal({ open, room, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmation('');
    setError(null);
    setSubmitting(false);
  }, [open, room.Room_ID]);

  if (!open) return null;

  const requiredText = room.Name.trim();
  const canSubmit = confirmation.trim() === requiredText && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteRoom(room.Room_ID);
      onSuccess(room);
      onClose();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      setError(axiosErr?.response?.data?.error || axiosErr?.message || 'Failed to delete room');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delete room</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">This cannot be undone.</p>
              <p className="mt-1">
                Deleting <span className="font-mono font-bold">{room.Name}</span> also removes its
                recurring class schedules and historical booking records. The server rejects deletion
                if any active or future bookings still reference the room.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="delete-room-confirm" className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
              Type <span className="font-mono font-bold text-red-600 dark:text-red-300">{requiredText}</span> to confirm
            </label>
            <input
              id="delete-room-confirm"
              autoFocus
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={requiredText}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {submitting ? 'Deleting…' : 'Delete room'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
