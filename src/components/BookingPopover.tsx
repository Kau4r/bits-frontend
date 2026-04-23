import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import dayjs from 'dayjs';
import { AlignLeft, Check, Clock3, MapPin, Repeat, Trash2, UserRound, X } from 'lucide-react';
import type { Room } from '@/types/room';
import { useModal } from '@/context/ModalContext';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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
}

interface BookingPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        title: string;
        description: string;
        roomId: number;
        date: string;
        startTime: string;
        endTime: string;
        repeat: boolean;
    }) => void;
    onUpdate?: (id: string, data: {
        title: string;
        description: string;
        roomId: number;
        date: string;
        startTime: string;
        endTime: string;
    }) => void;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onRemove?: (id: string) => void;
    startTime: Date;
    endTime: Date;
    rooms: Room[];
    selectedRoomId?: number;
    isSubmitting?: boolean;
    viewingBooking?: ViewingBooking | null;
    canEdit?: boolean;
    canApprove?: boolean;
}

const generateTimeOptions = () => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour = h.toString().padStart(2, '0');
            const min = m.toString().padStart(2, '0');
            options.push(`${hour}:${min}`);
        }
    }
    return options;
};

const TIME_OPTIONS = generateTimeOptions();

const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
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
type RepeatMode = 'NONE' | 'WEEKLY';

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
    isSubmitting = false,
    viewingBooking,
    canEdit = false,
    canApprove = false,
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
    }, [isOpen, startTime, endTime, selectedRoomId, viewingBooking]);

    useEffect(() => {
        if (isOpen && inputRef.current && !isViewMode) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isViewMode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-floating-dropdown="true"]')) return;

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

    const selectedRoom = rooms.find(r => r.Room_ID === roomId);
    const currentStatus = getStatusTheme(viewingBooking?.status);
    const timeOptions = TIME_OPTIONS.map(t => ({ value: t, label: formatTimeDisplay(t) }));
    const roomOptions = rooms.map(room => ({ value: room.Room_ID, label: room.Name }));
    const repeatLabel = `Every week on ${dayjs(date).format('dddd')}`;
    const repeatOptions = [
        { value: 'NONE', label: 'Does not repeat' },
        { value: 'WEEKLY', label: repeatLabel },
    ];

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !roomId) return;

        if (isEditMode && viewingBooking && onUpdate) {
            onUpdate(viewingBooking.id, {
                title: title.trim(),
                description: description.trim(),
                roomId,
                date,
                startTime: startTimeValue,
                endTime: endTimeValue,
            });
        } else if (isCreateMode) {
            onSave({
                title: title.trim(),
                description: description.trim(),
                roomId,
                date,
                startTime: startTimeValue,
                endTime: endTimeValue,
                repeat: repeatMode === 'WEEKLY',
            });
        }
        setTitle('');
        setDescription('');
        setRepeatMode('NONE');
    };

    const handleRemove = async () => {
        if (!viewingBooking || !onRemove) return;
        const confirmed = await modal.showConfirm('Are you sure you want to remove this booking? This action cannot be undone.', 'Remove Booking');
        if (confirmed) {
            onRemove(viewingBooking.id);
        }
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

                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
                            {canApprove && viewingBooking.status === 'PENDING' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onReject?.(viewingBooking.id)}
                                        disabled={isSubmitting}
                                        className="rounded-full px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onApprove?.(viewingBooking.id)}
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
                                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20"
                                            required
                                        />
                                        <label className="sr-only" htmlFor="booking-start-time">Start time</label>
                                        <FloatingSelect
                                            id="booking-start-time"
                                            value={startTimeValue}
                                            placeholder="Start time"
                                            options={timeOptions}
                                            onChange={setStartTimeValue}
                                        />
                                        <label className="sr-only" htmlFor="booking-end-time">End time</label>
                                        <FloatingSelect
                                            id="booking-end-time"
                                            value={endTimeValue}
                                            placeholder="End time"
                                            options={timeOptions}
                                            onChange={setEndTimeValue}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <FieldIcon><MapPin className="h-4 w-4" /></FieldIcon>
                                    <div className="relative flex-1">
                                        <label className="sr-only" htmlFor="booking-room">Room</label>
                                        <FloatingSelect
                                            id="booking-room"
                                            value={roomId || ''}
                                            placeholder="Select room"
                                            options={roomOptions}
                                            onChange={setRoomId}
                                        />
                                        {selectedRoom && (
                                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Selected room: {selectedRoom.Name}</p>
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
                                        <div className="flex-1">
                                            <FloatingSelect
                                                id="booking-repeat"
                                                value={repeatMode}
                                                placeholder="Does not repeat"
                                                options={repeatOptions}
                                                onChange={(value) => setRepeatMode(value as RepeatMode)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

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
        </div>
    );
}
