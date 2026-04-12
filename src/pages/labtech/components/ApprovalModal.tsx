import { createPortal } from 'react-dom';

interface ApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (assignedItemId?: number) => void;
    request: {
        id: number;
        item: {
            Item_ID: number;
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

    const requiresAssignment = !request.item.Item_ID;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const itemId = formData.get('itemId');

        onConfirm(itemId ? parseInt(itemId as string) : undefined);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Approve Request</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Approve the device borrowing request from {request.borrower.First_Name} {request.borrower.Last_Name}
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
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{request.item.Item_Type} - {request.item.Brand}</div>
                            </div>
                        </div>

                        {/* Assign Specific Item */}
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Assign Specific Item {requiresAssignment && <span className="text-red-500">*</span>}
                            </label>
                            {availableItems.length > 0 ? (
                                <select
                                    name="itemId"
                                    required={requiresAssignment}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">
                                        {requiresAssignment ? 'Select an item' : 'Keep currently assigned item'}
                                    </option>
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
                                    required={requiresAssignment}
                                    placeholder={requiresAssignment ? 'Enter item ID' : 'Enter item ID to reassign'}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {requiresAssignment && availableItems.length > 0
                                    ? 'Select a specific item to assign to this request'
                                    : requiresAssignment
                                        ? 'No available items found. Enter a valid item ID manually.'
                                        : 'Leave blank to keep the currently assigned item.'}
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
                            className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
        </div>,
        document.body
    );
}
