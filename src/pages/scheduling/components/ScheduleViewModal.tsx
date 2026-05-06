import { Clock3, MapPin, Tag, X } from 'lucide-react';
import dayjs from 'dayjs';

interface ScheduleViewData {
    title: string;
    scheduleType?: string;
    days: string;
    startTime: string;
    endTime: string;
    roomName: string;
}

interface ScheduleViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    schedule: ScheduleViewData | null;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDays = (csv: string) => {
    const nums = csv
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(d => !Number.isNaN(d) && d >= 0 && d <= 6);
    if (nums.length === 0) return '—';
    return nums.sort((a, b) => a - b).map(n => dayNames[n]).join(', ');
};

const formatScheduleType = (type?: string) => {
    if (!type) return 'Class';
    return type
        .toLowerCase()
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const FieldIcon = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
        {children}
    </div>
);

export default function ScheduleViewModal({ isOpen, onClose, schedule }: ScheduleViewModalProps) {
    if (!isOpen || !schedule) return null;

    const start = dayjs(schedule.startTime);
    const end = dayjs(schedule.endTime);
    const timeRange = start.isValid() && end.isValid()
        ? `${start.format('h:mm A')} – ${end.format('h:mm A')}`
        : '—';

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30 dark:border-white/10 dark:bg-[#111827]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full bg-rose-500" />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Class schedule</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Close schedule details"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    <div className="mb-5 flex items-start gap-4">
                        <span className="mt-2 h-4 w-4 rounded-full bg-rose-500" />
                        <div className="min-w-0 flex-1">
                            <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                                {schedule.title}
                            </h2>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
                                    {formatScheduleType(schedule.scheduleType)}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Read-only — imported from the room's class schedule</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex gap-4 rounded-2xl px-1 py-2">
                            <FieldIcon><Clock3 className="h-4 w-4" /></FieldIcon>
                            <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {formatDays(schedule.days)}
                                </div>
                                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                                    {timeRange}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 rounded-2xl px-1 py-2">
                            <FieldIcon><MapPin className="h-4 w-4" /></FieldIcon>
                            <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{schedule.roomName || '—'}</div>
                                <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Room</div>
                            </div>
                        </div>

                        <div className="flex gap-4 rounded-2xl px-1 py-2">
                            <FieldIcon><Tag className="h-4 w-4" /></FieldIcon>
                            <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatScheduleType(schedule.scheduleType)}</div>
                                <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Type</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
