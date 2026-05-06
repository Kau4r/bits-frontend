import { AlertTriangle, Info, X, XCircle } from 'lucide-react';

interface WarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'warning' | 'error' | 'info';
}

const modalTheme = {
    warning: {
        Icon: AlertTriangle,
        dot: 'bg-amber-500',
        icon: 'text-amber-600 dark:text-amber-300',
        panel: 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100',
    },
    error: {
        Icon: XCircle,
        dot: 'bg-rose-500',
        icon: 'text-rose-600 dark:text-rose-300',
        panel: 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100',
    },
    info: {
        Icon: Info,
        dot: 'bg-indigo-500',
        icon: 'text-indigo-600 dark:text-cyan-300',
        panel: 'bg-indigo-50 text-indigo-900 dark:bg-cyan-400/10 dark:text-cyan-100',
    },
};

export default function WarningModal({
    isOpen,
    onClose,
    title = 'Warning',
    message,
    type = 'warning',
}: WarningModalProps) {
    if (!isOpen) return null;

    const theme = modalTheme[type];
    const Icon = theme.Icon;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={onClose}>
            <div
                className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30 dark:border-white/10 dark:bg-[#111827]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${theme.dot}`} />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Scheduling notice</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Close notice"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-6">
                    <div className="flex gap-4">
                        <div className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full ${theme.panel}`}>
                            <Icon className={`h-5 w-5 ${theme.icon}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 dark:bg-cyan-400 dark:text-slate-950 dark:shadow-cyan-400/20 dark:hover:bg-cyan-300"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}