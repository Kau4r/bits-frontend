import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { FloatingCombobox } from '@/ui/FloatingCombobox';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { formatItemType, formatBrand, isBrandPlaceholder } from '@/lib/utils';

interface ApprovableItem {
    Item_ID: number;
    Item_Type: string;
    Brand: string;
    Serial_Number: string;
    location?: string | null;
}

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
    availableItems?: ApprovableItem[];
    isLoading?: boolean;
}

const makeOptionLabel = (item: ApprovableItem): string => {
    const type = formatItemType(item.Item_Type) || 'Unknown';
    const brand = formatBrand(item.Brand);
    const sn = item.Serial_Number?.trim() || 'No SN';
    const loc = item.location?.trim();
    return loc
        ? `${type} — ${brand} · SN ${sn} · ${loc}`
        : `${type} — ${brand} · SN ${sn}`;
};

export default function ApprovalModal({
    isOpen,
    onClose,
    onConfirm,
    request,
    availableItems = [],
    isLoading = false,
}: ApprovalModalProps) {
    const [inputText, setInputText] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, isOpen);

    const labelToId = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of availableItems) map.set(makeOptionLabel(item), item.Item_ID);
        return map;
    }, [availableItems]);

    const options = useMemo(
        () => availableItems.map(item => {
            const label = makeOptionLabel(item);
            return { value: label, label };
        }),
        [availableItems],
    );

    useEffect(() => {
        if (!isOpen) return;
        // Pre-fill if request already has an assigned item that exists in the available list
        if (request?.item.Item_ID && request.item.Item_ID > 0) {
            const existing = availableItems.find(i => i.Item_ID === request.item.Item_ID);
            if (existing) {
                const label = makeOptionLabel(existing);
                setInputText(label);
                setSelectedItemId(existing.Item_ID);
                return;
            }
        }
        setInputText('');
        setSelectedItemId(null);
    }, [isOpen, request?.id, availableItems]);

    if (!isOpen || !request) return null;

    const requiresAssignment = !request.item.Item_ID;
    const hasItems = availableItems.length > 0;
    const isValid = !requiresAssignment || selectedItemId !== null;

    const handleComboChange = (text: string) => {
        setInputText(text);
        const id = labelToId.get(text);
        setSelectedItemId(id ?? null);
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isValid) return;
        onConfirm(selectedItemId ?? undefined);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Approve Request</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Approve the device borrowing request from {request.borrower.First_Name} {request.borrower.Last_Name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label="Close"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Borrower:</span>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{request.borrower.First_Name} {request.borrower.Last_Name}</div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Requested Item:</span>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatItemType(request.item.Item_Type) || 'Unknown'} {!isBrandPlaceholder(request.item.Brand) ? `— ${request.item.Brand}` : ''}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label htmlFor="approval-item-combobox" className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Assign Specific Item {requiresAssignment && <span className="text-red-500">*</span>}
                            </label>
                            <FloatingCombobox
                                id="approval-item-combobox"
                                value={inputText}
                                onChange={handleComboChange}
                                options={options}
                                placeholder={hasItems ? 'Search by type, brand, serial, or location…' : 'No available items'}
                                required={requiresAssignment}
                                disabled={!hasItems}
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {!hasItems
                                    ? 'No matching items in inventory. Reject this request or wait for restock.'
                                    : requiresAssignment
                                        ? 'Type to filter, then pick an item from the list.'
                                        : 'Leave the current item or pick a different one to reassign.'}
                            </p>
                            {requiresAssignment && hasItems && inputText.trim() && selectedItemId === null && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                    Pick an item from the suggestions to continue.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !isValid}
                            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
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
        document.body,
    );
}
