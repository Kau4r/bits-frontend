
interface ApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (assignedItemId?: number) => void;
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
    availableItems?: Array<{
        Item_ID: number;
        Item_Type: string;
        Brand: string;
        Serial_Number: string;
    }>;
    isLoading?: boolean;
}

export default function ApprovalModal({
    isOpen,
    onClose,
    onConfirm,
    request,
    availableItems = [],
    isLoading = false,
}: ApprovalModalProps) {
    if (!isOpen || !request) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const itemId = formData.get('itemId');

        onConfirm(itemId ? parseInt(itemId as string) : undefined);
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Approve Request</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Approve the device borrowing request from {request.borrower.First_Name} {request.borrower.Last_Name}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Request Details */}
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Borrower:</span>
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{request.borrower.First_Name} {request.borrower.Last_Name}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Requested Item:</span>
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{request.item.Item_Type} - {request.item.Brand}</div>
                        </div>
                    </div>

                    {/* Assign Specific Item */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Assign Specific Item {availableItems.length > 0 && <span className="text-red-500">*</span>}
                        </label>
                        {availableItems.length > 0 ? (
                            <select
                                name="itemId"
                                required
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                            >
                                <option value="">Select an item</option>
                                {availableItems.map((item) => (
                                    <option key={item.Item_ID} value={item.Item_ID}>
                                        {item.Item_Type} - {item.Brand} (SN: {item.Serial_Number})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                name="itemId"
                                placeholder="Enter item ID"
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                            />
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {availableItems.length > 0
                                ? 'Select a specific item to assign to this request'
                                : 'No available items found. Enter item ID manually or leave blank.'}
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
                            className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    Approving...
                                </>
                            ) : (
                                'Approve Request'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
