import dayjs from 'dayjs';

interface ConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    eventDetails?: {
        title: string;
        oldStart: Date;
        oldEnd: Date;
        newStart: Date;
        newEnd: Date;
    };
}

export default function ConfirmModal({
    isOpen,
    onConfirm,
    onCancel,
    title = 'Confirm Action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    eventDetails,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 bg-indigo-500/10">
                    <span className="text-2xl">📅</span>
                    <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {title}
                    </h3>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-gray-800 dark:text-gray-300 leading-relaxed">
                        {message}
                    </p>

                    {eventDetails && (
                        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                            <div className="font-medium text-gray-900 dark:text-white">{eventDetails.title}</div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-600 dark:text-gray-500 text-xs mb-1">FROM</div>
                                    <div className="text-gray-700 dark:text-gray-400">
                                        {dayjs(eventDetails.oldStart).format('MMM D, h:mm A')}
                                    </div>
                                    <div className="text-gray-700 dark:text-gray-400">
                                        to {dayjs(eventDetails.oldEnd).format('h:mm A')}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-indigo-600 dark:text-indigo-400 text-xs mb-1">TO</div>
                                    <div className="text-gray-900 dark:text-white font-medium">
                                        {dayjs(eventDetails.newStart).format('MMM D, h:mm A')}
                                    </div>
                                    <div className="text-gray-900 dark:text-white font-medium">
                                        to {dayjs(eventDetails.newEnd).format('h:mm A')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium disabled:opacity-50"
                    >
                        {isLoading ? 'Updating...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
