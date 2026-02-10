

interface WarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'warning' | 'error' | 'info';
}

export default function WarningModal({
    isOpen,
    onClose,
    title = 'Warning',
    message,
    type = 'warning',
}: WarningModalProps) {
    if (!isOpen) return null;

    const iconColors = {
        warning: 'text-yellow-400',
        error: 'text-red-400',
        info: 'text-blue-400',
    };

    const bgColors = {
        warning: 'bg-yellow-500/10',
        error: 'bg-red-500/10',
        info: 'bg-blue-500/10',
    };

    const icons = {
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️',
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className={`flex items-center gap-3 px-6 py-4 ${bgColors[type]}`}>
                    <span className="text-2xl">{icons[type]}</span>
                    <h3 className={`text-lg font-semibold ${iconColors[type]}`}>
                        {title}
                    </h3>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    <p className="text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
