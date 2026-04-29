import { useState, useRef, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import dayjs from 'dayjs';
import { AlignLeft, Check, Clock3, MapPin, Repeat, Trash2, UserRound, X } from 'lucide-react';
import type { Room } from '@/types/room';
import { useModal } from '@/context/ModalContext';
import { FloatingSelect } from '@/ui/FloatingSelect';
import RoomCombobox from '@/pages/scheduling/components/RoomCombobox';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import RecurrenceModal, { type RecurrenceConfig, buildRrule } from '@/components/RecurrenceModal';

interface ViewingBooking {
    id: string;
    title: string;
    description: string;
    roomId: number;
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
    createdBy: string;
    createdById: number;
    status: string;
    seriesId?: number | null;
    originalStart?: string | null;
    isVirtual?: boolean;
    isRecurring?: boolean;
}

interface RecurrenceConflict {
    when: string;
    reason: string;
}

interface BookingPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    // When the parent's create-series call returns 409, hand the per-occurrence
    // conflicts back so the recurrence modal can render them with quick "skip"
    // actions instead of blowing the user away with a wall of error text.
    recurrenceConflicts?: RecurrenceConflict[];
    // Live conflict check using already-loaded room schedules + bookings.
    // The popover shows a banner for one-off bookings, and the recurrence
    // modal flags conflicting preview occurrences in red.
    checkConflict?: (roomId: number, start: Date, end: Date) => string | null;
    onSave: (data: {
        title: string;
        description: string;
        roomId: number;
        date: string;
        startTime: string;
        endTime: string;
        repeat: boolean;
        recurrence?: { rrule: string; config: RecurrenceConfig };
    }) => void;
    onUpdate?: (id: string, data: {
        title: string;
        description: string;
        roomId: number;
        date: string;
        startTime: string;
        endTime: string;
    }, applyToSeries?: boolean) => void;
    onApprove?: (id: string, applyToSeries?: boolean) => void;
    onReject?: (id: string, applyToSeries?: boolean) => void;
    onRemove?: (id: string, applyToSeries?: boolean) => void;
    startTime: Date;
    endTime: Date;
    rooms: Room[];
    selectedRoomId?: number;
    // When the sidebar's room filter is narrowed to a single room, the booking
    // form locks the room field to that room — no other rooms appear in the
    // combo box and the user cannot change the selection.
    lockedRoomId?: number;
    isSubmitting?: boolean;
    viewingBooking?: ViewingBooking | null;
    canEdit?: boolean;
    canApprove?: boolean;
}

const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

// Parses free-form time input like "11:30", "1130", "11:30am", "11pm",
// "11 30", "23:00". Returns HH:MM (24-hour) or null if unparseable.
const parseTimeInput = (input: string): string | null => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,2})[\s:.\-]?(\d{2})?\s*(am|pm|a|p)?$/);
    if (!match) return null;

    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3]?.[0];

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (minute < 0 || minute > 59) return null;

    if (period === 'a') {
        if (hour < 1 || hour > 12) return null;
        hour = hour === 12 ? 0 : hour;
    } else if (period === 'p') {
        if (hour < 1 || hour > 12) return null;
        hour = hour === 12 ? 12 : hour + 12;
    } else {
        if (hour < 0 || hour > 23) return null;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const TIME_OPTIONS_30MIN = (() => {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return opts;
})();

interface TimeInputProps {
    id: string;
    value: string; // HH:MM 24-hour
    onChange: (next: string) => void;
    placeholder?: string;
    ariaLabel?: string;
    disabled?: boolean;
}

const TimeInput = ({ id, value, onChange, placeholder, ariaLabel, disabled = false }: TimeInputProps) => {
    const [draft, setDraft] = useState(value ? formatTimeDisplay(value) : '');
    const [isOpen, setIsOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        setDraft(value ? formatTimeDisplay(value) : '');
        setIsDirty(false);
    }, [value]);

    const filteredOptions = useMemo(() => {
        if (!isDirty) return TIME_OPTIONS_30MIN;
        const q = draft.trim().toLowerCase().replace(/\s+/g, '');
        if (!q) return TIME_OPTIONS_30MIN;
        return TIME_OPTIONS_30MIN.filter((opt) => {
            const display = formatTimeDisplay(opt).toLowerCase().replace(/\s+/g, '');
            return display.includes(q) || opt.replace(':', '').includes(q);
        });
    }, [draft, isDirty]);

    const commitDraft = () => {
        const parsed = parseTimeInput(draft);
        if (parsed) {
            if (parsed !== value) onChange(parsed);
            setDraft(formatTimeDisplay(parsed));
        } else {
            setDraft(value ? formatTimeDisplay(value) : '');
        }
    };

    const handleSelect = (opt: string) => {
        onChange(opt);
        setDraft(formatTimeDisplay(opt));
        setIsOpen(false);
    };

    // Click outside closes & commits typed value.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                commitDraft();
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, draft, value]);

    // Scroll the highlighted option into view when opening.
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const active = listRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
        active?.scrollIntoView({ block: 'nearest' });
    }, [isOpen, value]);

    return (
        <div ref={containerRef} className="relative">
            <input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={disabled}
                readOnly={disabled}
                value={draft}
                onChange={(e) => {
                    if (disabled) return;
                    setDraft(e.target.value); setIsDirty(true); setIsOpen(true);
                }}
                onFocus={(e) => {
                    if (disabled) return;
                    e.currentTarget.select(); setIsDirty(false); setIsOpen(true);
                }}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commitDraft();
                        setIsOpen(false);
                        e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                        setIsOpen(false);
                        e.currentTarget.blur();
                    } else if (e.key === 'ArrowDown' && !isOpen) {
                        setIsOpen(true);
                    }
                }}
                placeholder={placeholder}
                className={`w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20 ${disabled ? 'cursor-not-allowed bg-slate-100 dark:bg-white/[0.06]' : ''}`}
            />
            {isOpen && (
                <ul
                    ref={listRef}
                    role="listbox"
                    className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900"
                >
                    {filteredOptions.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                            No matching time. Press Enter to use what you typed.
                        </li>
                    ) : (
                        filteredOptions.map((opt) => {
                            const isActive = opt === value;
                            return (
                                <li key={opt}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        data-active={isActive}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelect(opt)}
                                        className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
                                            isActive
                                                ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
                                        }`}
                                    >
                                        {formatTimeDisplay(opt)}
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            )}
        </div>
    );
};

const statusTheme: Record<string, { dot: string; pill: string; label: string }> = {
    APPROVED: {
        dot: 'bg-emerald-500',
        pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
        label: 'Approved',
    },
    PENDING: {
        dot: 'bg-amber-500',
        pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
        label: 'Pending',
    },
    REJECTED: {
        dot: 'bg-rose-500',
        pill: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
        label: 'Rejected',
    },
    CANCELLED: {
        dot: 'bg-slate-400',
        pill: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30',
        label: 'Cancelled',
    },
};

const getStatusTheme = (status?: string) => statusTheme[String(status || 'PENDING').toUpperCase()] || statusTheme.PENDING;
type RepeatMode = 'NONE' | 'WEEKLY' | 'CUSTOM';

const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const summarizeRecurrence = (cfg: RecurrenceConfig): string => {
    const every = cfg.interval > 1 ? `every ${cfg.interval} ` : 'every ';
    if (cfg.frequency === 'DAILY') return `Repeats ${every}${cfg.interval > 1 ? 'days' : 'day'}`;
    if (cfg.frequency === 'WEEKLY') {
        const days = [...cfg.byDay].sort().map((d) => DAY_LABELS_SHORT[d]).join(', ');
        return `Repeats ${every}${cfg.interval > 1 ? 'weeks' : 'week'} on ${days}`;
    }
    if (cfg.frequency === 'MONTHLY') {
        if (cfg.monthlyMode === 'BYSETPOS') {
            const pos = cfg.setPos === -1 ? 'last' : ['first', 'second', 'third', 'fourth'][cfg.setPos - 1];
            return `Repeats ${every}${cfg.interval > 1 ? 'months' : 'month'} on the ${pos} ${DAY_LABELS_FULL[cfg.byDay[0] ?? 0]}`;
        }
        return `Repeats ${every}${cfg.interval > 1 ? 'months' : 'month'} on day ${cfg.byMonthDay}`;
    }
    if (cfg.frequency === 'YEARLY') return `Repeats yearly`;
    return 'Custom recurrence';
};

const FieldIcon = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
        {children}
    </div>
);

export default function BookingPopover({
    isOpen,
    onClose,
    onSave,
    onUpdate,
    onApprove,
    onReject,
    onRemove,
    startTime,
    endTime,
    rooms,
    selectedRoomId,
    lockedRoomId,
    isSubmitting = false,
    viewingBooking,
    canEdit = false,
    canApprove = false,
    recurrenceConflicts,
    checkConflict,
}: BookingPopoverProps) {
    const modal = useModal();
    const isViewMode = !!viewingBooking && !canEdit;
    const isEditMode = !!viewingBooking && canEdit;
    const isCreateMode = !viewingBooking;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [roomId, setRoomId] = useState(selectedRoomId || 0);
    const [date, setDate] = useState(dayjs(startTime).format('YYYY-MM-DD'));
    const [startTimeValue, setStartTimeValue] = useState(dayjs(startTime).format('HH:mm'));
    const [endTimeValue, setEndTimeValue] = useState(dayjs(endTime).format('HH:mm'));
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('NONE');
    const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig | null>(null);
    const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
    // Single checkbox shared by Update + Remove. When ticked on a recurring
    // event, the action applies to the whole series; otherwise just this one.
    const [applyToSeries, setApplyToSeries] = useState(false);

    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    useFocusTrap(popoverRef, isOpen);

    useEffect(() => {
        if (!isOpen) return;

        if (viewingBooking) {
            setTitle(viewingBooking.title);
            setDescription(viewingBooking.description);
            setRoomId(viewingBooking.roomId);
            setDate(viewingBooking.date);
            setStartTimeValue(viewingBooking.startTime);
            setEndTimeValue(viewingBooking.endTime);
            setRepeatMode('NONE');
            return;
        }

        setTitle('');
        setDescription('');
        setDate(dayjs(startTime).format('YYYY-MM-DD'));
        setStartTimeValue(dayjs(startTime).format('HH:mm'));
        setEndTimeValue(dayjs(endTime).format('HH:mm'));
        if (selectedRoomId) setRoomId(selectedRoomId);
        setRepeatMode('NONE');
        setRecurrenceConfig(null);
        setIsRecurrenceModalOpen(false);
        setApplyToSeries(false);
    }, [isOpen, startTime, endTime, selectedRoomId, viewingBooking]);

    useEffect(() => {
        if (isOpen && inputRef.current && !isViewMode) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isViewMode]);

    // When the parent reports series-creation conflicts, auto-open the
    // recurrence modal so the user can resolve them inline.
    useEffect(() => {
        if (isOpen && recurrenceConflicts && recurrenceConflicts.length > 0 && recurrenceConfig) {
            setIsRecurrenceModalOpen(true);
        }
    }, [isOpen, recurrenceConflicts, recurrenceConfig]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-floating-dropdown="true"]')) return;
            // The recurrence modal is rendered in a portal outside this popover,
            // so without this guard a click inside it would bubble up and close
            // the popover (along with the modal it lives inside).
            if (target?.closest('[data-recurrence-modal="true"]')) return;

            if (popoverRef.current && target && !popoverRef.current.contains(target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    const currentStatus = getStatusTheme(viewingBooking?.status);
    // Approved-locked: once a booking is APPROVED ("done"), the owner can no
    // longer reschedule it. Date / time / room fields lock; title and notes
    // remain editable so users can refine purpose without changing the slot.
    const isApprovedLocked = isEditMode && String(viewingBooking?.status || '').toUpperCase() === 'APPROVED';
    // Only enforce the sidebar's single-room lock during creation. In edit mode
    // the user is amending an existing booking that may live in a different
    // room — locking would silently rewrite the booking's room on open.
    // For approved-locked bookings we pin the room to the booking's own room
    // so the combobox shows it as locked too.
    const effectiveLockedRoomId = isCreateMode
        ? lockedRoomId
        : (isApprovedLocked ? viewingBooking?.roomId : undefined);
    const repeatLabel = `Every week on ${dayjs(date).format('dddd')}`;
    const repeatOptions = [
        { value: 'NONE', label: 'Does not repeat' },
        { value: 'WEEKLY', label: repeatLabel },
        { value: 'CUSTOM', label: recurrenceConfig ? summarizeRecurrence(recurrenceConfig) : 'Custom…' },
    ];

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !roomId) return;

        const startMs = dayjs(`${date}T${startTimeValue}`).valueOf();
        const endMs = dayjs(`${date}T${endTimeValue}`).valueOf();
        if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
            if (endMs <= startMs) {
                modal.showError('Please set end time to be more than start time', 'Invalid time');
                return;
            }
            if (endMs - startMs < 30 * 60 * 1000) {
                modal.showError('Bookings must be at least 30 minutes long.', 'Booking too short');
                return;
            }
        }

        if (isEditMode && viewingBooking && onUpdate) {
            onUpdate(viewingBooking.id, {
                title: title.trim(),
                description: description.trim(),
                roomId,
                date,
                startTime: startTimeValue,
                endTime: endTimeValue,
            }, viewingBooking.isRecurring ? applyToSeries : undefined);
        } else if (isCreateMode) {
            const payload: Parameters<typeof onSave>[0] = {
                title: title.trim(),
                description: description.trim(),
                roomId,
                date,
                startTime: startTimeValue,
                endTime: endTimeValue,
                repeat: repeatMode === 'WEEKLY',
            };
            if (repeatMode === 'CUSTOM' && recurrenceConfig) {
                payload.recurrence = {
                    rrule: buildRrule(recurrenceConfig),
                    config: recurrenceConfig,
                };
            }
            onSave(payload);
        }
        setTitle('');
        setDescription('');
        setRepeatMode('NONE');
    };

    const handleRemove = async () => {
        if (!viewingBooking || !onRemove) return;
        const isRecurring = !!viewingBooking.isRecurring;
        const confirmMessage = isRecurring
            ? (applyToSeries
                ? 'Cancel ALL events in this recurring series? This cannot be undone.'
                : 'Cancel just this occurrence? Other events in the series stay scheduled.')
            : 'Are you sure you want to remove this booking? This action cannot be undone.';
        const confirmed = await modal.showConfirm(confirmMessage, 'Remove Booking');
        if (!confirmed) return;
        onRemove(viewingBooking.id, isRecurring ? applyToSeries : undefined);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" onClick={onClose}>
            <div
                ref={popoverRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30 dark:border-white/10 dark:bg-[#111827]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${isCreateMode ? 'bg-indigo-500' : currentStatus.dot}`} />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {isCreateMode ? 'New booking' : isEditMode ? 'Edit booking' : 'Booking details'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Close booking modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {isViewMode && viewingBooking ? (
                    <div className="overflow-y-auto px-6 py-5">
                        <div className="mb-5 flex items-start gap-4">
                            <span className={`mt-2 h-4 w-4 rounded-full ${currentStatus.dot}`} />
                            <div className="min-w-0 flex-1">
                                <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                                    {viewingBooking.title}
                                </h2>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${currentStatus.pill}`}>
                                        {currentStatus.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex gap-4 rounded-2xl px-1 py-2">
                                <FieldIcon><Clock3 className="h-4 w-4" /></FieldIcon>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {dayjs(viewingBooking.date).format('dddd, MMMM D, YYYY')}
                                    </div>
                                    <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                        {formatTimeDisplay(viewingBooking.startTime)} - {formatTimeDisplay(viewingBooking.endTime)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 rounded-2xl px-1 py-2">
                                <FieldIcon><MapPin className="h-4 w-4" /></FieldIcon>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{viewingBooking.roomName}</div>
                                    <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Room</div>
                                </div>
                            </div>

                            <div className="flex gap-4 rounded-2xl px-1 py-2">
                                <FieldIcon><UserRound className="h-4 w-4" /></FieldIcon>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{viewingBooking.createdBy}</div>
                                    <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Organizer</div>
                                </div>
                            </div>

                            {viewingBooking.description && (
                                <div className="flex gap-4 rounded-2xl px-1 py-2">
                                    <FieldIcon><AlignLeft className="h-4 w-4" /></FieldIcon>
                                    <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                                        {viewingBooking.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {canApprove && viewingBooking.status === 'PENDING' && viewingBooking.isRecurring && (
                            <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={applyToSeries}
                                    onChange={(e) => setApplyToSeries(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20"
                                />
                                <span>
                                    Agree to all events in the series
                                    {!applyToSeries && (
                                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">— off = this occurrence only</span>
                                    )}
                                </span>
                            </label>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
                            {canApprove && viewingBooking.status === 'PENDING' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onReject?.(viewingBooking.id, viewingBooking.isRecurring ? applyToSeries : undefined)}
                                        disabled={isSubmitting}
                                        className="rounded-full px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onApprove?.(viewingBooking.id, viewingBooking.isRecurring ? applyToSeries : undefined)}
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                                    >
                                        <Check className="h-4 w-4" />
                                        {isSubmitting ? 'Approving...' : 'Approve'}
                                    </button>
                                </>
                            )}
                            {!(canApprove && viewingBooking.status === 'PENDING') && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                            <div className="mb-5 flex items-start gap-4">
                                <span className={`mt-3 h-4 w-4 rounded-full ${isEditMode ? currentStatus.dot : 'bg-indigo-500'}`} />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Add title"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-2xl font-semibold tracking-tight text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#615fff] dark:focus:ring-[#615fff]/20"
                                    required
                                />
                            </div>

                            {isApprovedLocked && (
                                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                    <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900 dark:bg-amber-400/30 dark:text-amber-100">!</span>
                                    <p className="leading-snug">
                                        This booking has been approved, so its date, time, and room are locked.
                                        Cancel and create a new booking if you need to change the schedule.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex gap-4">
                                    <FieldIcon><Clock3 className="h-4 w-4" /></FieldIcon>
                                    <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                                        <label className="sr-only" htmlFor="booking-date">Date</label>
                                        <input
                                            id="booking-date"
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            disabled={isApprovedLocked}
                                            readOnly={isApprovedLocked}
                                            className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20 ${isApprovedLocked ? 'cursor-not-allowed bg-slate-100 dark:bg-white/[0.06]' : ''}`}
                                            required
                                        />
                                        <label className="sr-only" htmlFor="booking-start-time">Start time</label>
                                        <TimeInput
                                            id="booking-start-time"
                                            value={startTimeValue}
                                            onChange={setStartTimeValue}
                                            placeholder="Start time"
                                            ariaLabel="Start time"
                                            disabled={isApprovedLocked}
                                        />
                                        <label className="sr-only" htmlFor="booking-end-time">End time</label>
                                        <TimeInput
                                            id="booking-end-time"
                                            value={endTimeValue}
                                            onChange={setEndTimeValue}
                                            placeholder="End time"
                                            ariaLabel="End time"
                                            disabled={isApprovedLocked}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <FieldIcon><MapPin className="h-4 w-4" /></FieldIcon>
                                    <div className="relative flex-1">
                                        <label className="sr-only" htmlFor="booking-room">Room</label>
                                        <RoomCombobox
                                            id="booking-room"
                                            value={roomId || ''}
                                            rooms={rooms}
                                            onChange={setRoomId}
                                            lockedRoomId={effectiveLockedRoomId}
                                            placeholder="Select Room"
                                        />
                                        {effectiveLockedRoomId != null && !isApprovedLocked && (
                                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                Room is locked to your sidebar filter.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <FieldIcon><AlignLeft className="h-4 w-4" /></FieldIcon>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Add description or notes"
                                        className="min-h-[96px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20"
                                    />
                                </div>

                                {isCreateMode && (
                                    <div className="flex gap-4">
                                        <FieldIcon><Repeat className="h-4 w-4" /></FieldIcon>
                                        <div className="flex-1 space-y-2">
                                            <FloatingSelect
                                                id="booking-repeat"
                                                value={repeatMode}
                                                placeholder="Does not repeat"
                                                options={repeatOptions}
                                                onChange={(value) => {
                                                    const next = value as RepeatMode;
                                                    setRepeatMode(next);
                                                    if (next === 'CUSTOM') {
                                                        setIsRecurrenceModalOpen(true);
                                                    }
                                                }}
                                            />
                                            {repeatMode === 'CUSTOM' && recurrenceConfig && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsRecurrenceModalOpen(true)}
                                                    className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                                                >
                                                    Edit recurrence rule
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isEditMode && viewingBooking?.isRecurring && (
                            <label className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={applyToSeries}
                                    onChange={(e) => setApplyToSeries(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20"
                                />
                                <span>
                                    Apply to all events in the series
                                    {!applyToSeries && (
                                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">— off = this occurrence only</span>
                                    )}
                                </span>
                            </label>
                        )}

                        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                            {isEditMode && viewingBooking && onRemove ? (
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                </button>
                            ) : <div />}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!title.trim() || !roomId || isSubmitting}
                                    className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-400 dark:text-slate-950 dark:shadow-cyan-400/20 dark:hover:bg-cyan-300"
                                >
                                    {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {isCreateMode && (
                <RecurrenceModal
                    isOpen={isRecurrenceModalOpen}
                    anchorStart={dayjs(`${date}T${startTimeValue}`).toDate()}
                    anchorEnd={dayjs(`${date}T${endTimeValue}`).toDate()}
                    initial={recurrenceConfig ?? undefined}
                    conflicts={recurrenceConflicts}
                    checkConflict={
                        checkConflict && roomId
                            ? (start, end) => checkConflict(roomId, start, end)
                            : undefined
                    }
                    onClose={() => {
                        setIsRecurrenceModalOpen(false);
                        // If user dismissed the modal without saving and never had
                        // a config, fall back to NONE so the selector matches reality.
                        if (!recurrenceConfig && repeatMode === 'CUSTOM') {
                            setRepeatMode('NONE');
                        }
                    }}
                    onSave={(config) => {
                        setRecurrenceConfig(config);
                        setRepeatMode('CUSTOM');
                        setIsRecurrenceModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}
