import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import {
  changeUserRole,
  getRoleChangeImpact,
  type RoleChangeImpact,
} from '@/services/user';
import type { User_Role } from '@/types/user';
import { formatRole } from '@/pages/sysad/UserPage';

interface Props {
  open: boolean;
  userId: number;
  currentRole: User_Role;
  newRole: User_Role;
  onClose: () => void;
  onSuccess: (newRole: User_Role) => void;
}

/**
 * Two-step failsafe modal for changing a user's role:
 *   1. Fetches role-change-impact and shows the in-flight items the change touches.
 *   2. Requires a written reason. Blockers (unreturned gear, in-flight forms)
 *      need an explicit "force" override.
 * Confirming bumps Token_Valid_After on the user, kicking them out of any
 * existing session.
 */
export default function RoleChangeConfirmModal({
  open,
  userId,
  currentRole,
  newRole,
  onClose,
  onSuccess,
}: Props) {
  const [impact, setImpact] = useState<RoleChangeImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setImpact(null);
    setReason('');
    setForce(false);
    setError(null);
    setLoading(true);
    getRoleChangeImpact(userId)
      .then(setImpact)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load impact'))
      .finally(() => setLoading(false));
  }, [open, userId]);

  if (!open) return null;

  const counts = impact?.impact.counts;
  const blockers = impact?.impact.blockers || [];
  const needsForce = blockers.length > 0;
  const reasonOk = reason.trim().length >= 5;
  const canSubmit = !submitting && !loading && reasonOk && (!needsForce || force);

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await changeUserRole(userId, { newRole, reason: reason.trim(), force: needsForce ? force : undefined });
      onSuccess(newRole);
      onClose();
    } catch (err: any) {
      const body = err?.response?.data;
      setError(body?.error || err?.message || 'Failed to change role');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change role</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {formatRole(currentRole)} → <span className="font-semibold text-indigo-600 dark:text-indigo-300">{formatRole(newRole)}</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading impact preview…</p>
          ) : error && !impact ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : impact && counts ? (
            <>
              {/* Blockers — must be acknowledged with force */}
              {blockers.length > 0 ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4" /> Blockers
                  </div>
                  <ul className="ml-6 list-disc space-y-1 text-sm text-red-700 dark:text-red-300">
                    {blockers.map((b) => (
                      <li key={b.kind}>{b.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <ShieldCheck className="h-4 w-4" /> No blocking in-flight items.
                </div>
              )}

              {/* Impact summary counts */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <ImpactRow label="Active assigned tickets" value={counts.tickets} />
                <ImpactRow label="Unreturned items" value={counts.borrowings} bold={counts.borrowings > 0} />
                <ImpactRow label="In-flight forms (approver)" value={counts.formsAsApprover} bold={counts.formsAsApprover > 0} />
                <ImpactRow label="Pending bookings (approver)" value={counts.pendingBookingsAsApprover} />
                <ImpactRow label="Future bookings (requester)" value={counts.futureBookingsAsRequester} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
                  Reason for change <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Promoted to LabHead after probation; effective today."
                  className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Required. Stored in the audit log alongside the change. Min 5 characters.
                </p>
              </div>

              {needsForce && (
                <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    Force the change despite the blockers above. Tickets assigned to this user will be unassigned automatically; everything else stays untouched and may need manual cleanup.
                  </span>
                </label>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Confirming will also <span className="font-semibold">end the user's current session</span> — they'll need to log in again to pick up the new permissions.
              </p>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </p>
              )}
            </>
          ) : null}
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
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Changing…' : 'Confirm role change'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ImpactRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60 ${bold ? 'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30' : ''}`}>
      <span className="truncate text-xs text-gray-600 dark:text-gray-300">{label}</span>
      <span className={`text-sm font-semibold ${bold ? 'text-amber-800 dark:text-amber-200' : 'text-gray-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}
