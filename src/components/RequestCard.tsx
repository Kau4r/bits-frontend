import dayjs from 'dayjs';
import {
    AlertTriangle,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    Hourglass,
    MapPin,
    Package,
    RotateCcw,
    User,
    X,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BorrowingStatus } from '@/types/borrowing';
import { formatItemType } from '@/lib/utils';

export interface BorrowingRequest {
    id: number;
    item: {
        Item_ID: number;
        Item_Type: string;
        Brand: string;
        Serial_Number: string;
        location?: string | null;
    };
    borrower: {
        User_ID: number;
        First_Name: string;
        Last_Name: string;
    };
    borrowDate: string;
    returnDate: string;
    purpose: string;
    status: BorrowingStatus;
    createdAt?: string;
}

interface RequestCardProps {
    request: BorrowingRequest;
    variant?: 'faculty' | 'admin' | 'compact';
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
    onMarkReturned?: (id: number) => void;
}

const statusStyles: Record<BorrowingStatus, { className: string; Icon: LucideIcon }> = {
    PENDING: {
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30',
        Icon: Hourglass,
    },
    APPROVED: {
        className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
        Icon: CheckCircle,
    },
    REJECTED: {
        className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
        Icon: XCircle,
    },
    BORROWED: {
        className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
        Icon: Package,
    },
    RETURNED: {
        className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30',
        Icon: Check,
    },
    OVERDUE: {
        className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
        Icon: AlertTriangle,
    },
};

export default function RequestCard({
    request,
    variant = 'faculty',
    onApprove,
    onReject,
    onMarkReturned,
}: RequestCardProps) {
    const isCompact = variant === 'compact';
    const isAdmin = variant === 'admin';
    const status = statusStyles[request.status];
    const StatusIcon = status.Icon;

    if (isCompact) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600">
                <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <Package className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {formatItemType(request.item.Item_Type)}
                            </p>
                            <p className="truncate text-xs text-gray-600 dark:text-gray-400">{request.item.Brand}</p>
                        </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {request.status}
                    </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{dayjs(request.borrowDate).format('MMM D, h:mm A')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <RotateCcw className="h-3 w-3 shrink-0" />
                        <span>{dayjs(request.returnDate).format('MMM D, h:mm A')}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                        {formatItemType(request.item.Item_Type)}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">
                        {request.item.Brand} • SN: {request.item.Serial_Number}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className={`truncate ${request.item.location ? '' : 'italic text-gray-400 dark:text-gray-500'}`}>
                            {request.item.location || 'Location not set'}
                        </span>
                    </p>
                    {isAdmin && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{request.borrower.First_Name} {request.borrower.Last_Name}</span>
                        </p>
                    )}
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${status.className}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {request.status}
                </span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-700/50 dark:bg-gray-700/40">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3" />
                        Borrow
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {dayjs(request.borrowDate).format('MMM D, YYYY')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {dayjs(request.borrowDate).format('h:mm A')}
                    </div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-700/50 dark:bg-gray-700/40">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        Return
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {dayjs(request.returnDate).format('MMM D, YYYY')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {dayjs(request.returnDate).format('h:mm A')}
                    </div>
                </div>
            </div>

            <div className="mb-3">
                <p className="mb-1 text-sm font-medium text-gray-900 dark:text-white">Purpose</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{request.purpose}</p>
            </div>

            {isAdmin && request.status === 'PENDING' && (
                <div className="mt-4 flex gap-2">
                    <button
                        onClick={() => onReject?.(request.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:border-red-500/30 dark:bg-red-600/20 dark:text-red-300 dark:hover:bg-red-600/30"
                    >
                        <X className="h-4 w-4" />
                        Reject
                    </button>
                    <button
                        onClick={() => onApprove?.(request.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-green-300 bg-green-100 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200 dark:border-green-500/30 dark:bg-green-600/20 dark:text-green-300 dark:hover:bg-green-600/30"
                    >
                        <Check className="h-4 w-4" />
                        Accept
                    </button>
                </div>
            )}

            {isAdmin && (request.status === 'APPROVED' || request.status === 'BORROWED') && (
                <button
                    onClick={() => onMarkReturned?.(request.id)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                    <RotateCcw className="h-4 w-4" />
                    Mark as Returned
                </button>
            )}
        </div>
    );
}
