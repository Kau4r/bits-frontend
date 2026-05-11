import { createPortal } from 'react-dom';
import { useRef } from 'react';
import { History as HistoryIcon, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import ItemHistoryTimeline from '@/pages/labtech/components/ItemHistoryTimeline';
import { formatBrand, formatItemType } from '@/lib/utils';

interface ItemHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemId: number;
    itemCode?: string | null;
    itemType?: string | null;
    brand?: string | null;
    serialNumber?: string | null;
}

export default function ItemHistoryModal({
    isOpen,
    onClose,
    itemId,
    itemCode,
    itemType,
    brand,
    serialNumber,
}: ItemHistoryModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, isOpen);

    if (!isOpen) return null;

    return createPortal(
        // z-[60] so we sit above ItemModal (z-50) without obscuring keyboard focus handling
        <div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-history-title"
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header — subtle indigo accent strip to distinguish from the parent modal */}
                <header className="relative border-b border-gray-200 bg-gradient-to-br from-indigo-50 to-white px-6 py-5 dark:border-gray-700 dark:from-indigo-500/5 dark:to-gray-900">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-indigo-100 p-2.5 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:ring-indigo-500/30">
                                <HistoryIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                            </div>
                            <div className="min-w-0">
                                <h2
                                    id="item-history-title"
                                    className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
                                >
                                    Asset History
                                </h2>
                                {itemCode && (
                                    <p className="mt-0.5 font-mono text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                        {itemCode}
                                    </p>
                                )}
                                <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-400">
                                    {[formatBrand(brand ?? undefined), formatItemType(itemType ?? undefined)]
                                        .filter(Boolean)
                                        .join(' · ') || 'Inventory item'}
                                    {serialNumber ? ` · SN ${serialNumber}` : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close history"
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Body — let the timeline component do the heavy lifting */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <ItemHistoryTimeline itemId={itemId} />
                </div>

                {/* Footer — a single close action keeps the modal calm and focused */}
                <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Read-only audit log. Updates appear automatically as the asset is used.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        Close
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
}
