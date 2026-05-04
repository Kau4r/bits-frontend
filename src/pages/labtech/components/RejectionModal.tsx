import { createPortal } from 'react-dom';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { formatBrand } from '@/lib/utils';

interface RejectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    request: {
        id: number;
        item: {
            Item_Type: string;
            Brand: string;
        };
        borrower: {
            First_Name: string;
            Last_Name: string;
        };
    } | null;
    isLoading?: boolean;
}

export default function RejectionModal({
    isOpen,
    onClose,
    onConfirm,
    request,
    isLoading = false,
}: RejectionModalProps) {
    const [reasonError, setReasonError] = useState('');
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, isOpen);

    if (!isOpen || !request) return null;

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const reason = formData.get('reason') as string;

        if (!reason || !reason.trim()) {
            setReasonError('Reason is required.');
            return;
        }

        setReasonError('');
        onConfirm(reason);
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
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reject Request</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Provide a reason for rejecting this request. The borrower will be notified.
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

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {/* Request Details */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-700">
                            <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Borrower:</span>
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{request.borrower.First_Name} {request.borrower.Last_Name}</div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Requested Item:</span>
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{request.item.Item_Type} - {formatBrand(request.item.Brand)}</div>
                            </div>
                        </div>

                        {/* Rejection Reason */}
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="reason"
                                required
                                rows={4}
                                onChange={() => setReasonError('')}
                                placeholder="Please provide a clear reason for rejecting this request..."
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                            {reasonError && (
                                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{reasonError}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                This reason will be sent to the faculty member
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">...</span>
                                    Rejecting...
                                </>
                            ) : (
                                'Reject Request'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
