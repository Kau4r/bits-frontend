import { createPortal } from 'react-dom';
import { useRef, useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

// Quick-pick presets for booking rejections. Selecting one prefills the
// textarea (still editable); 'Other' clears it.
const BOOKING_REJECTION_PRESETS = [
    'Room already booked for this time slot',
    'Room is under maintenance',
    'Conflicts with class schedule',
    'Insufficient details or justification',
];

interface BookingRejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    bookingLabel?: string;
    isRecurring?: boolean;
    applyToSeries?: boolean;
    isLoading?: boolean;
}

export default function BookingRejectModal({
    isOpen,
    onClose,
    onConfirm,
    bookingLabel,
    isRecurring = false,
    applyToSeries = false,
    isLoading = false,
}: BookingRejectModalProps) {
    const [reasonError, setReasonError] = useState('');
    const [presetChoice, setPresetChoice] = useState('');
    const [reason, setReason] = useState('');
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, isOpen);

    useEffect(() => {
        if (!isOpen) {
            setReasonError('');
            setPresetChoice('');
            setReason('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePresetChange = (value: string) => {
        setPresetChoice(value);
        setReasonError('');
        if (value === 'OTHER') {
            setReason('');
        } else if (value) {
            setReason(value);
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = reason.trim();
        if (trimmed.length < 3) {
            setReasonError('Please provide a reason (at least 3 characters).');
            return;
        }
        setReasonError('');
        onConfirm(trimmed);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reject Booking</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {isRecurring && applyToSeries
                                ? 'Provide a reason. This rejection will apply to the entire series.'
                                : 'Provide a reason for rejecting this booking. The requester will be notified.'}
                        </p>
                    </div>
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

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {bookingLabel && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Booking:</span>
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{bookingLabel}</div>
                            </div>
                        )}

                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Common reason (optional)
                            </label>
                            <select
                                value={presetChoice}
                                onChange={(e) => handlePresetChange(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Pick a preset or type your own below...</option>
                                {BOOKING_REJECTION_PRESETS.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                                <option value="OTHER">Other (specify below)</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="reason"
                                value={reason}
                                onChange={(e) => { setReason(e.target.value); setReasonError(''); }}
                                required
                                rows={4}
                                placeholder="Please provide a clear reason for rejecting this booking..."
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                            {reasonError && (
                                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{reasonError}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                The requester will see this reason in their notification. You can edit a preset before sending.
                            </p>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isLoading ? 'Rejecting...' : 'Reject Booking'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
