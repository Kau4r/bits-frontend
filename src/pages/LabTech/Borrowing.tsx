import { useState, useEffect, useMemo } from 'react';
import { useBorrowingEvents } from '@/hooks/useBorrowingEvents';
import RequestCard, { type BorrowingRequest } from '@/components/borrowing/RequestCard';
import ApprovalModal from '@/components/borrowing/ApprovalModal';
import RejectionModal from '@/components/borrowing/RejectionModal';
import { useModal } from '@/context/ModalContext';
import { getBorrowings, approveBorrowing, rejectBorrowing, returnBorrowing } from '@/services/borrowing';
import { fetchInventory } from '@/services/inventory';
import type { Item } from '@/types/inventory';
import Search from '@/components/Search';
import {
    FunnelIcon,
    InboxArrowDownIcon,
    CheckCircleIcon,
    QueueListIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    ArrowsUpDownIcon
} from '@heroicons/react/24/outline';

type TabType = 'pending' | 'active' | 'all';
type StatusFilter = 'all' | 'PENDING' | 'APPROVED' | 'BORROWED' | 'OVERDUE' | 'RETURNED' | 'REJECTED';
type SortOption = 'newest' | 'oldest' | 'due_soonest';

export default function Borrowing() {
    const modal = useModal();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [requests, setRequests] = useState<BorrowingRequest[]>([]);
    const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [approvalModal, setApprovalModal] = useState<{
        isOpen: boolean;
        request: BorrowingRequest | null;
    }>({ isOpen: false, request: null });

    const [rejectionModal, setRejectionModal] = useState<{
        isOpen: boolean;
        request: BorrowingRequest | null;
    }>({ isOpen: false, request: null });

    // Load requests
    useEffect(() => {
        loadRequests();
    }, []);

    // Listen for real-time updates
    useBorrowingEvents(() => {
        loadRequests();
    });

    const loadRequests = async () => {
        try {
            setIsLoading(true);
            const [borrowings, items] = await Promise.all([
                getBorrowings(),
                fetchInventory()
            ]);

            const mapped: BorrowingRequest[] = borrowings
                .filter(b => b.Item || b.Requested_Item_Type) // Show item borrowings (assigned item OR requested type)
                .map(b => ({
                    id: b.Borrow_Item_ID,
                    item: {
                        Item_ID: b.Item?.Item_ID || 0,
                        Item_Type: b.Item?.Item_Type || b.Requested_Item_Type || 'Unknown',
                        Brand: b.Item?.Brand || 'TBD',
                        Serial_Number: b.Item?.Serial_Number || 'Not Assigned',
                    },
                    borrower: {
                        User_ID: b.Borrower_ID,
                        First_Name: b.Borrower?.First_Name || 'Unknown',
                        Last_Name: b.Borrower?.Last_Name || 'User',
                    },
                    borrowDate: b.Borrow_Date,
                    returnDate: b.Return_Date || '',
                    purpose: b.Purpose || '',
                    status: b.Status,
                    createdAt: b.Borrow_Date,
                }));

            setRequests(mapped);
            // Filter for Items only (not Computers) and ensure they're borrowable and available
            // Filter for Items only (not Computers) and ensure they're borrowable and available
            const itemsOnly = items.filter((item): item is Item =>
                'Item_Type' in item &&
                (item.IsBorrowable !== false) &&
                item.Status === 'AVAILABLE'
            );
            setInventoryItems(itemsOnly);
        } catch (error) {
            console.error('Failed to load borrowings:', error);
            await modal.showError('Failed to load borrowing requests', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => ({
        pendingReview: requests.filter(r => r.status === 'PENDING').length,
        activeLoans: requests.filter(r => r.status === 'APPROVED' || r.status === 'BORROWED').length,
        overdue: requests.filter(r => r.status === 'OVERDUE').length,
        returned: requests.filter(r => r.status === 'RETURNED').length,
    }), [requests]);

    const filteredRequests = useMemo(() => {
        let filtered = requests;

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.item.Brand.toLowerCase().includes(q) ||
                r.item.Serial_Number.toLowerCase().includes(q) ||
                r.borrower.First_Name.toLowerCase().includes(q) ||
                r.borrower.Last_Name.toLowerCase().includes(q) ||
                r.item.Item_Type.toLowerCase().includes(q)
            );
        }

        if (activeTab === 'pending') {
            filtered = filtered.filter(r => r.status === 'PENDING');
        } else if (activeTab === 'active') {
            filtered = filtered.filter(r => ['APPROVED', 'BORROWED', 'OVERDUE'].includes(r.status));
        }

        if (activeTab === 'all' && statusFilter !== 'all') {
            filtered = filtered.filter(r => r.status === statusFilter);
        }

        filtered = [...filtered].sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            } else if (sortBy === 'oldest') {
                return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            } else if (sortBy === 'due_soonest') {
                return new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime();
            }
            return 0;
        });

        return filtered;
    }, [requests, activeTab, statusFilter, sortBy, searchTerm]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setSortBy('newest');
    };

    const hasActiveFilters = searchTerm || statusFilter !== 'all' || sortBy !== 'newest';

    const handleApprove = async () => {
        if (!approvalModal.request) return;
        setIsLoading(true);
        try {
            await approveBorrowing(approvalModal.request.id, approvalModal.request.item.Item_ID);

            await modal.showSuccess('Request approved successfully!', 'Success');
            setApprovalModal({ isOpen: false, request: null });
            await loadRequests();
        } catch (error) {
            await modal.showError('Failed to approve request', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionModal.request) return;
        setIsLoading(true);
        try {
            await rejectBorrowing(rejectionModal.request.id, reason, rejectionModal.request.item.Item_ID);

            await modal.showSuccess('Request rejected and borrower notified', 'Success');
            setRejectionModal({ isOpen: false, request: null });
            await loadRequests();
        } catch (error) {
            await modal.showError('Failed to reject request', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkReturned = async (id: number) => {
        setIsLoading(true);
        try {
            await returnBorrowing(id, { condition: 'AVAILABLE', remarks: '' });

            await modal.showSuccess('Device marked as returned', 'Success');
            await loadRequests();
        } catch (error) {
            await modal.showError('Failed to update status', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && requests.length === 0) {
        return (
            <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
                    ))}
                </div>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/50" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900 overflow-y-auto">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Borrowing Requests</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage equipment loans, approvals, and return status</p>
                </div>
                <button
                    onClick={loadRequests}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                        <ClockIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingReview}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                        <CheckCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeLoans}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                        <ExclamationTriangleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overdue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <InboxArrowDownIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Returned</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.returned}</p>
                    </div>
                </div>
            </div>

            <div className="mb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`inline-flex items-center gap-2 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'pending'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <ClockIcon className="h-4 w-4" />
                            Pending Review
                        </button>
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`inline-flex items-center gap-2 border-x border-gray-300 px-4 py-2 text-sm font-medium transition-colors dark:border-gray-600 ${activeTab === 'active'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <CheckCircleIcon className="h-4 w-4" />
                            Active
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`inline-flex items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <QueueListIcon className="h-4 w-4" />
                            All Records
                        </button>
                    </div>
                    <div className="min-w-[280px] flex-1">
                        <Search
                            searchTerm={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Search by brand, SN, or borrower..."
                            showLabel={false}
                        />
                    </div>
                    {activeTab === 'all' && (
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                            >
                                <option value="all">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="BORROWED">Borrowed</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="RETURNED">Returned</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                            <FunnelIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                    )}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="due_soonest">Due Soonest</option>
                        </select>
                        <ArrowsUpDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-white">{filteredRequests.length}</span>
                        <span>result(s)</span>
                    </div>
                </div>
            </div>

            <div className="pb-10">
                {filteredRequests.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredRequests.map((request) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                variant="admin"
                                onApprove={(id) => {
                                    const req = requests.find(r => r.id === id);
                                    if (req) setApprovalModal({ isOpen: true, request: req });
                                }}
                                onReject={(id) => {
                                    const req = requests.find(r => r.id === id);
                                    if (req) setRejectionModal({ isOpen: true, request: req });
                                }}
                                onMarkReturned={handleMarkReturned}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-full mb-4">
                            <InboxArrowDownIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {hasActiveFilters ? "No requests match your filters" : `No ${activeTab === 'pending' ? 'pending' : activeTab === 'active' ? 'active' : ''} requests found`}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {hasActiveFilters
                                ? "Try adjusting your search or filter settings"
                                : activeTab === 'pending'
                                    ? "Great job! All borrowing requests have been reviewed."
                                    : "There are no active equipment loans at this time."}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="mt-6 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            <ApprovalModal
                isOpen={approvalModal.isOpen}
                onClose={() => setApprovalModal({ isOpen: false, request: null })}
                onConfirm={handleApprove}
                request={approvalModal.request ? {
                    id: approvalModal.request.id,
                    item: approvalModal.request.item,
                    borrower: approvalModal.request.borrower,
                } : null}
                availableItems={approvalModal.request ?
                    inventoryItems.filter(item => item.Item_Type.toLowerCase() === approvalModal.request!.item.Item_Type.toLowerCase() && item.Item_ID)
                        .map(item => ({ Item_ID: item.Item_ID!, Item_Type: item.Item_Type, Brand: item.Brand, Serial_Number: item.Serial_Number }))
                    : []}
                isLoading={isLoading}
            />

            <RejectionModal
                isOpen={rejectionModal.isOpen}
                onClose={() => setRejectionModal({ isOpen: false, request: null })}
                onConfirm={handleReject}
                request={rejectionModal.request ? {
                    id: rejectionModal.request.id,
                    item: rejectionModal.request.item,
                    borrower: rejectionModal.request.borrower,
                } : null}
                isLoading={isLoading}
            />
        </div>
    );
}
