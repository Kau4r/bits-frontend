import dayjs from 'dayjs';
import { ArrowRight, CalendarDays, Clock3, X } from 'lucide-react';

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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={onCancel}>
            <div
                className="w-full max-w-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30 dark:border-white/10 dark:bg-[#111827]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full bg-indigo-500 dark:bg-cyan-300" />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Reschedule booking</span>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Close confirmation"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-6">
                    <div className="flex gap-4">
                        <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-cyan-400/10 dark:text-cyan-300">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
                        </div>
                    </div>

                    {eventDetails && (
                        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="mb-4 flex items-start gap-3">
                                <span className="mt-1 h-3 w-3 rounded-full bg-indigo-500 dark:bg-cyan-300" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{eventDetails.title}</p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Drag-and-drop schedule change</p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                <div className="rounded-xl bg-white p-3 dark:bg-slate-950/50">
                                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        From
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{dayjs(eventDetails.oldStart).format('MMM D, h:mm A')}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">to {dayjs(eventDetails.oldEnd).format('h:mm A')}</p>
                                </div>

                                <div className="hidden justify-center text-slate-400 sm:flex">
                                    <ArrowRight className="h-5 w-5" />
                                </div>

                                <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-200 dark:bg-cyan-400/10 dark:ring-cyan-300/20">
                                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-cyan-300">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        To
                                    </div>
                                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{dayjs(eventDetails.newStart).format('MMM D, h:mm A')}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">to {dayjs(eventDetails.newEnd).format('h:mm A')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-50 dark:bg-cyan-400 dark:text-slate-950 dark:shadow-cyan-400/20 dark:hover:bg-cyan-300"
                    >
                        {isLoading ? 'Updating...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}