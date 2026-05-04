import { useState, useEffect } from 'react';
import { getBorrowings } from '@/services/borrowing';
import type { Borrowing } from '@/types/borrowing';
import { formatItemType, formatBrand } from '@/lib/utils';

interface CountdownProps {
    returnDate: string;
}

const Countdown = ({ returnDate }: CountdownProps) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const target = new Date(returnDate).getTime();
            const diff = target - now;

            if (diff <= 0) {
                setIsOverdue(true);
                setTimeLeft('Overdue!');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 24) {
                const days = Math.floor(hours / 24);
                setTimeLeft(`${days}d ${hours % 24}h`);
            } else {
                setTimeLeft(`${hours}h ${minutes}m`);
            }
            setIsOverdue(false);
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [returnDate]);

    return (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${isOverdue
            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
            : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
            }`}>
            {isOverdue ? '⚠️ ' : '⏱️ '}{timeLeft}
        </span>
    );
};

export default function MyBorrowingRequests() {
    const [requests, setRequests] = useState<Borrowing[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setIsLoading(true);
            const data = await getBorrowings({ role: 'borrower' });
            setRequests(data);
        } catch (error) {
            console.error('Failed to load borrowing requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const pendingRequests = requests.filter(r => r.Status === 'PENDING');
    const activeLoans = requests.filter(r => ['APPROVED', 'BORROWED'].includes(r.Status));

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">📦 My Borrowing Requests</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">📦 My Borrowing Requests</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">No borrowing requests yet</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📦 My Borrowing Requests</h3>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                        <span>⏳</span> Pending Approval ({pendingRequests.length})
                    </h4>
                    <div className="space-y-2">
                        {pendingRequests.map((req) => (
                            <div key={req.Borrow_Item_ID} className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 border border-yellow-500/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-medium text-sm">
                                            {formatItemType(req.Item?.Item_Type || req.Requested_Item_Type) || 'Unknown Item'}
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-400 text-xs">
                                            {req.Item ? `${formatBrand(req.Item.Brand)} • ${req.Item.Item_Code}` : 'Specific Item Pending Assignment'}
                                        </p>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                                        Pending
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Loans */}
            {activeLoans.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                        <span>✅</span> Active Loans ({activeLoans.length})
                    </h4>
                    <div className="space-y-2">
                        {activeLoans.map((req) => (
                            <div key={req.Borrow_Item_ID} className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 border border-green-500/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-medium text-sm">
                                            {formatItemType(req.Item?.Item_Type || req.Requested_Item_Type) || 'Unknown Item'}
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-400 text-xs">
                                            {req.Item ? `${formatBrand(req.Item.Brand)} • ${req.Item.Item_Code}` : 'Item Info Unavailable'}
                                        </p>
                                    </div>
                                    {req.Return_Date && <Countdown returnDate={req.Return_Date} />}
                                </div>
                                {req.Return_Date && (
                                    <p className="text-gray-600 dark:text-gray-500 text-xs mt-2">
                                        Return by: {new Date(req.Return_Date).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
