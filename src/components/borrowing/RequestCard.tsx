import dayjs from 'dayjs';
import type { BorrowingStatus } from '@/types/borrowing';

export interface BorrowingRequest {
    id: number;
    item: {
        Item_ID: number;
        Item_Type: string;
        Brand: string;
        Serial_Number: string;
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

const statusColors: Record<BorrowingStatus, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    BORROWED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    RETURNED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    OVERDUE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusIcons: Record<BorrowingStatus, string> = {
    PENDING: '⏳',
    APPROVED: '✓',
    REJECTED: '✗',
    BORROWED: '📦',
    RETURNED: '✓',
    OVERDUE: '⚠️',
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

    if (isCompact) {
        // Compact variant for sidebar
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📱</span>
                        <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{request.item.Item_Type}</span>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{request.item.Brand}</div>
                        </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[request.status]}`}>
                        {statusIcons[request.status]} {request.status}
                    </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex items-center gap-1">
                        <span>📅</span>
                        <span>{dayjs(request.borrowDate).format('MMM D, h:mm A')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>↩️</span>
                        <span>{dayjs(request.returnDate).format('MMM D, h:mm A')}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            {/* Header with device type and status */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{request.item.Item_Type}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            <div>{request.item.Brand} • SN: {request.item.Serial_Number}</div>
                        </div>
                        {isAdmin && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <div>👤 {request.borrower.First_Name} {request.borrower.Last_Name}</div>
                            </div>
                        )}
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[request.status]}`}>
                    {statusIcons[request.status]} {request.status}
                </span>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">📅 Borrow</div>
                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {dayjs(request.borrowDate).format('MMM D, YYYY')}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        {dayjs(request.borrowDate).format('h:mm A')}
                    </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">⏰ Return</div>
                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {dayjs(request.returnDate).format('MMM D, YYYY')}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        {dayjs(request.returnDate).format('h:mm A')}
                    </div>
                </div>
            </div>

            {/* Purpose */}
            <div className="mb-3">
                <div className="text-sm text-gray-900 dark:text-white mb-1">Purpose</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{request.purpose}</div>
            </div>

            {/* Admin Actions */}
            {isAdmin && request.status === 'PENDING' && (
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => onReject?.(request.id)}
                        className="flex-1 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg border border-red-500/30 transition-colors text-sm font-medium"
                    >
                        ✗ Reject
                    </button>
                    <button
                        onClick={() => onApprove?.(request.id)}
                        className="flex-1 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg border border-green-500/30 transition-colors text-sm font-medium"
                    >
                        ✓ Accept
                    </button>
                </div>
            )}

            {isAdmin && (request.status === 'APPROVED' || request.status === 'BORROWED') && (
                <button
                    onClick={() => onMarkReturned?.(request.id)}
                    className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium mt-4"
                >
                    Mark as Returned
                </button>
            )}
        </div>
    );
}
