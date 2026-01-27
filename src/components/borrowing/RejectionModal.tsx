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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-white mb-2">✗ Reject Request</h2>
                    <p className="text-sm text-gray-400">
                        Provide a reason for rejecting this request. The borrower will be notified.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Request Details */}
                    <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                        <div>
                            <span className="text-xs text-gray-400">Borrower:</span>
                            <div className="text-sm text-white font-medium">{request.borrower.First_Name} {request.borrower.Last_Name}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">Requested Item:</span>
                            <div className="text-sm text-white font-medium">{request.item.Item_Type} - {request.item.Brand}</div>
                        </div>
                    </div>

                    {/* Rejection Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Reason for Rejection <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            name="reason"
                            required
                            rows={4}
                            placeholder="Please provide a clear reason for rejecting this request..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2.5 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            This reason will be sent to the faculty member
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    Rejecting...
                                </>
                            ) : (
                                <>
                                    ✗ Reject Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
