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
    if (!isOpen || !request) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const reason = formData.get('reason') as string;

        if (!reason || !reason.trim()) {
            return;
        }

        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reject Request</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Provide a reason for rejecting this request. The borrower will be notified.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Request Details */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-100 dark:border-gray-700">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Borrower:</span>
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{request.borrower.First_Name} {request.borrower.Last_Name}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Requested Item:</span>
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{request.item.Item_Type} - {request.item.Brand}</div>
                        </div>
                    </div>

                    {/* Rejection Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reason for Rejection <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="reason"
                            required
                            rows={4}
                            placeholder="Please provide a clear reason for rejecting this request..."
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-500 resize-none"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            This reason will be sent to the faculty member
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    Rejecting...
                                </>
                            ) : (
                                'Reject Request'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
