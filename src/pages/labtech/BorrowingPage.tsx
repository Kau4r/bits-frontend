import { useState, useEffect, useMemo } from 'react';
import { useBorrowingEvents } from '@/hooks/useBorrowingEvents';
import RequestCard, { type BorrowingRequest } from '@/components/RequestCard';
import ApprovalModal from '@/pages/labtech/components/ApprovalModal';
import RejectionModal from '@/pages/labtech/components/RejectionModal';
import WalkinBorrowingModal from '@/pages/labtech/components/WalkinBorrowingModal';
import type { WalkinBorrowingSubmit } from '@/pages/labtech/components/WalkinBorrowingModal';
import { useModal } from '@/context/ModalContext';
import { getBorrowings, approveBorrowing, rejectBorrowing, returnBorrowing, createWalkinBorrowing } from '@/services/borrowing';
import { getInventory } from '@/services/inventory';
import type { Item } from '@/types/inventory';
import Search from '@/components/Search';
import {
    Inbox,
    CheckCircle,
    List,
    RefreshCw,
    AlertTriangle,
    Clock,
    Plus
} from 'lucide-react';
import { FloatingSelect } from '@/ui/FloatingSelect';

type TabType = 'pending' | 'active' | 'all';
type StatusFilter = 'all' | 'PENDING' | 'APPROVED' | 'BORROWED' | 'OVERDUE' | 'RETURNED' | 'REJECTED';
type SortOption = 'newest' | 'oldest' | 'due_soonest';

export default function Borrowing() {
    const modal = useModal();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('all');
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

    const [walkinOpen, setWalkinOpen] = useState(false);

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
                getInventory()
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
        } else if (activeTab === 'all') {
            // Default view: hide REJECTED and RETURNED unless the user explicitly filters for them
            if (statusFilter === 'all') {
                filtered = filtered.filter(r => !['REJECTED', 'RETURNED'].includes(r.status));
            } else {
                filtered = filtered.filter(r => r.status === statusFilter);
            }
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

    const handleApprove = async (assignedItemId?: number) => {
        if (!approvalModal.request) return;
        setIsLoading(true);
        try {
            const currentItemId = approvalModal.request.item.Item_ID > 0
                ? approvalModal.request.item.Item_ID
                : undefined;
            await approveBorrowing(approvalModal.request.id, assignedItemId ?? currentItemId);

            await modal.showSuccess('Request approved successfully!', 'Success');
            setApprovalModal({ isOpen: false, request: null });
            await loadRequests();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to approve request';
            await modal.showError(message, 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async (reason: string) => {
        if (!rejectionModal.request) return;
        setIsLoading(true);
        try {
            await rejectBorrowing(rejectionModal.request.id, reason);

            await modal.showSuccess('Request rejected and borrower notified', 'Success');
            setRejectionModal({ isOpen: false, request: null });
            await loadRequests();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reject request';
            await modal.showError(message, 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleWalkinSubmit = async (payload: WalkinBorrowingSubmit) => {
        try {
            await createWalkinBorrowing(payload);
            setWalkinOpen(false);
            await loadRequests();
        } catch (error) {
            // Re-throw so the modal can display the backend error inline
            throw error;
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
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadRequests}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setWalkinOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" />
                        New Borrowing
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingReview}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeLoans}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overdue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Inbox className="w-6 h-6" />
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
                            onClick={() => setActiveTab('all')}
                            className={`inline-flex items-center gap-2 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <List className="h-4 w-4" />
                            All Records
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`inline-flex items-center gap-2  px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'pending'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Clock className="h-4 w-4" />
                            Pending Review
                        </button>
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`inline-flex items-center gap-2 rounded-r-lg border-x border-gray-300 px-4 py-2 text-sm font-medium transition-colors dark:border-gray-600 ${activeTab === 'active'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <CheckCircle className="h-4 w-4" />
                            Active
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
                        <div className="min-w-44">
                            <FloatingSelect
                                id="borrowing-status-filter"
                                value={statusFilter}
                                placeholder="All Status"
                                options={[
                                    { value: 'all', label: 'All Status' },
                                    { value: 'PENDING', label: 'Pending' },
                                    { value: 'APPROVED', label: 'Approved' },
                                    { value: 'BORROWED', label: 'Borrowed' },
                                    { value: 'OVERDUE', label: 'Overdue' },
                                    { value: 'RETURNED', label: 'Returned' },
                                    { value: 'REJECTED', label: 'Rejected' },
                                ]}
                                onChange={(status) => setStatusFilter(status as StatusFilter)}
                            />
                        </div>
                    )}
                    <div className="min-w-44">
                        <FloatingSelect
                            id="borrowing-sort-filter"
                            value={sortBy}
                            placeholder="Sort"
                            options={[
                                { value: 'newest', label: 'Newest First' },
                                { value: 'oldest', label: 'Oldest First' },
                                { value: 'due_soonest', label: 'Due Soonest' },
                            ]}
                            onChange={(sort) => setSortBy(sort as SortOption)}
                        />
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
                        <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-4">
                            <Inbox className="h-12 w-12 text-gray-400" />
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

            <WalkinBorrowingModal
                isOpen={walkinOpen}
                onClose={() => setWalkinOpen(false)}
                onSubmit={handleWalkinSubmit}
                availableItems={inventoryItems}
            />
        </div>
    );
}
