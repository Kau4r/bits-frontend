import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CornerUpLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  formDepartmentLabels,
  getDepartmentsForType,
  normalizeFormDepartment,
} from '@/types/formtypes';
import type { Form, FormDepartment } from '@/types/formtypes';
import { transferForm } from '@/services/forms';

interface Props {
  isOpen: boolean;
  form: Form;
  onClose: () => void;
  onSuccess: (updated: Form) => void;
}

const REASON_MAX = 500;

const ReturnForRevisionModal = ({ isOpen, form, onClose, onSuccess }: Props) => {
  const [selectedDept, setSelectedDept] = useState<FormDepartment | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  // Compute the list of visited prior departments (strictly before current, in workflow order).
  const priorDepartments = useMemo<FormDepartment[]>(() => {
    const workflow = getDepartmentsForType(form.Form_Type);
    const currentIndex = workflow.indexOf(form.Department);
    if (currentIndex <= 0) return [];

    const historicalDepartments = new Set<FormDepartment>();
    (form.History || []).forEach(historyEntry => {
      const normalized = normalizeFormDepartment(historyEntry.Department);
      if (normalized) historicalDepartments.add(normalized);
    });

    return workflow
      .slice(0, currentIndex)
      .filter(dept => historicalDepartments.has(dept));
  }, [form]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedDept(priorDepartments[0] ?? '');
    setReason('');
    setError(null);
    setSubmitting(false);
  }, [isOpen, form.Form_ID, priorDepartments]);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const reasonTooLong = reason.length > REASON_MAX;
  const canSubmit =
    !!selectedDept &&
    trimmedReason.length > 0 &&
    !reasonTooLong &&
    !submitting &&
    priorDepartments.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !selectedDept) return;

    setSubmitting(true);
    setError(null);
    try {
      const updated = await transferForm(
        form.Form_ID,
        selectedDept,
        undefined,
        trimmedReason,
      );
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return the form. Please try again.');
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
        className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
        onClick={event => event.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <CornerUpLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Return for Revision</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Send {form.Form_Code} back to a prior step with a reason.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {priorDepartments.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                This form has no visited prior departments to return to.
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Return to step <span className="text-red-500">*</span>
                  </label>
                  <FloatingSelect
                    id="return-for-revision-dept"
                    value={selectedDept}
                    placeholder="Select a prior step"
                    options={priorDepartments.map(dept => ({
                      value: dept,
                      label: formDepartmentLabels[dept],
                    }))}
                    onChange={value => setSelectedDept(value as FormDepartment)}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Only departments this form has already visited are available.
                  </p>
                </div>

                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reason for return <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    rows={4}
                    maxLength={REASON_MAX + 1}
                    placeholder="Explain what needs to be corrected before this form can proceed..."
                    className={cn(
                      'block w-full px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1e2939] border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-colors duration-200 resize-none',
                      reasonTooLong
                        ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-[#334155] focus:ring-blue-500 hover:border-gray-400 dark:hover:border-[#475569]',
                    )}
                  />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span
                      className={cn(
                        'text-gray-500 dark:text-gray-400',
                        reasonTooLong && 'text-red-500 dark:text-red-400',
                      )}
                    >
                      {reason.length}/{REASON_MAX}
                    </span>
                    {reasonTooLong && (
                      <span className="text-red-500 dark:text-red-400">
                        Reason exceeds {REASON_MAX} characters.
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-xl hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Returning...
                </>
              ) : (
                <>
                  <CornerUpLeft className="w-4 h-4" />
                  Return
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ReturnForRevisionModal;
