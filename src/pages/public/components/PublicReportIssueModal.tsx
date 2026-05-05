import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import {
    getPublicRooms,
    createPublicTicket,
    type PublicRoom,
    type PublicTicketPayload,
} from '@/services/publicRooms';

interface PublicReportIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ISSUE_TYPES: { value: PublicTicketPayload['issueType']; label: string }[] = [
    { value: 'HARDWARE', label: 'Hardware' },
    { value: 'SOFTWARE', label: 'Software' },
    { value: 'NETWORK', label: 'Network' },
    { value: 'OTHER', label: 'Other' },
];

const EQUIPMENT_OPTIONS: { value: PublicTicketPayload['equipment']; label: string }[] = [
    { value: 'MONITOR', label: 'Monitor' },
    { value: 'KEYBOARD', label: 'Keyboard' },
    { value: 'MOUSE', label: 'Mouse' },
    { value: 'MINI_PC', label: 'Mini PC' },
    { value: 'HEADSET', label: 'Headset' },
    { value: 'OTHER', label: 'Other' },
];

const REPORTER_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z .'-]*\s-\s\d{8}$/;

export default function PublicReportIssueModal({ isOpen, onClose }: PublicReportIssueModalProps) {
    const [rooms, setRooms] = useState<PublicRoom[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);

    const [reporterIdentifier, setReporterIdentifier] = useState('');
    const [roomId, setRoomId] = useState<number | '' | 'none'>('');
    const [issueType, setIssueType] = useState<PublicTicketPayload['issueType']>('HARDWARE');
    const [equipment, setEquipment] = useState<NonNullable<PublicTicketPayload['equipment']>>('MONITOR');
    const [description, setDescription] = useState('');
    const [pcNumber, setPcNumber] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Hardware/Software issues only make sense at a specific PC in a lab room.
    // When the reporter picks "Not tied to a specific room" or a non-lab room,
    // restrict the issue-type options to Network/Other and force-reset stale
    // selections.
    const selectedRoom = typeof roomId === 'number' ? rooms.find((r) => r.Room_ID === roomId) : null;
    const isLabContext = selectedRoom?.Room_Type === 'LAB';
    const availableIssueTypes = isLabContext
        ? ISSUE_TYPES
        : ISSUE_TYPES.filter((t) => t.value === 'NETWORK' || t.value === 'OTHER');

    useEffect(() => {
        if (!isLabContext && (issueType === 'HARDWARE' || issueType === 'SOFTWARE')) {
            setIssueType('OTHER');
        }
    }, [isLabContext, issueType]);

    const showPcNumber = isLabContext && (issueType === 'HARDWARE' || issueType === 'SOFTWARE');
    const showEquipment = isLabContext && issueType === 'HARDWARE';

    // Load rooms when modal opens.
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setIsLoadingRooms(true);

        getPublicRooms()
            .then((data) => {
                if (isMounted) setRooms(data);
            })
            .catch(() => {
                if (isMounted) setError('Failed to load room list. Please try again.');
            })
            .finally(() => {
                if (isMounted) setIsLoadingRooms(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    // Auto-close 2s after success.
    useEffect(() => {
        if (!success) return;
        const timer = window.setTimeout(() => {
            handleClose();
        }, 2000);
        return () => window.clearTimeout(timer);
    }, [success]);

    const handleClose = () => {
        if (isSubmitting) return;
        setReporterIdentifier('');
        setRoomId('');
        setIssueType('HARDWARE');
        setEquipment('MONITOR');
        setDescription('');
        setPcNumber('');
        setError(null);
        setSuccess(false);
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const reporterTrimmed = reporterIdentifier.trim();
        if (!reporterTrimmed) {
            setError('Please enter your name and student ID.');
            return;
        }
        if (!REPORTER_IDENTIFIER_PATTERN.test(reporterTrimmed)) {
            setError('Use the format "Name - 8-digit ID" (e.g. "John - 22102606").');
            return;
        }
        if (roomId === '') {
            setError("Please select a room, or choose 'Not tied to a specific room'.");
            return;
        }
        if (!description.trim()) {
            setError('Please provide a description.');
            return;
        }
        if (description.trim().length < 3) {
            setError('Description is too short (minimum 3 characters).');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: PublicTicketPayload = {
                reporterIdentifier: reporterIdentifier.trim(),
                roomId: roomId === 'none' ? null : (roomId as number),
                issueType,
                description: description.trim(),
                ...(showEquipment ? { equipment } : {}),
                ...(showPcNumber && pcNumber.trim() ? { pcNumber: pcNumber.trim() } : {}),
            };
            await createPublicTicket(payload);
            setSuccess(true);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
            const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;

            if (status === 429) {
                setError('Too many reports from your device — please wait a bit.');
            } else if (status === 400 && message) {
                setError(message);
            } else {
                setError('Failed to submit report. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Report an Issue</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Success state */}
                {success ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                        <p className="text-base font-semibold text-gray-900 dark:text-white">Report sent. Thanks!</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">A technician will look into it shortly.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                        {/* Reporter identifier */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Name - ID number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={reporterIdentifier}
                                onChange={(e) => setReporterIdentifier(e.target.value)}
                                maxLength={100}
                                placeholder="John - 22102606"
                                pattern="[A-Za-z][A-Za-z .'-]*\s-\s\d{8}"
                                title='Format: "Name - 8-digit ID" (e.g. "John - 22102606")'
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                disabled={isSubmitting}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Format: <span className="font-mono">Name - 8-digit ID</span>
                            </p>
                        </div>

                        {/* Room dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Room <span className="text-red-500">*</span>
                            </label>
                            {isLoadingRooms ? (
                                <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading rooms…
                                </div>
                            ) : (
                                <select
                                    value={roomId}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === '') setRoomId('');
                                        else if (v === 'none') setRoomId('none');
                                        else setRoomId(Number(v));
                                    }}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">Select a room</option>
                                    <option value="none">Not tied to a specific room</option>
                                    {rooms.map((r) => (
                                        <option key={r.Room_ID} value={r.Room_ID}>
                                            {r.Name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Issue type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Issue type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={issueType}
                                onChange={(e) => setIssueType(e.target.value as PublicTicketPayload['issueType'])}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                disabled={isSubmitting}
                            >
                                {availableIssueTypes.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* PC Number (optional; only when issue type could be PC-related) */}
                        {showPcNumber && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    PC Number <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={pcNumber}
                                    onChange={(e) => setPcNumber(e.target.value)}
                                    maxLength={50}
                                    placeholder="e.g. PC-12"
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}

                        {/* Equipment (hardware issues only) */}
                        {showEquipment && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Equipment <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={equipment}
                                    onChange={(e) => setEquipment(e.target.value as NonNullable<PublicTicketPayload['equipment']>)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    disabled={isSubmitting}
                                >
                                    {EQUIPMENT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                maxLength={1000}
                                placeholder="Describe the issue in detail…"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                disabled={isSubmitting}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-400 text-right">{description.length}/1000</p>
                        </div>

                        {/* Inline error */}
                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-1 pb-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="flex-1 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || isLoadingRooms}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Submitting…
                                    </>
                                ) : (
                                    'Submit Report'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
