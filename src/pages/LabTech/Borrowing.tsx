import { useState, useEffect } from 'react';
import { useBorrowingEvents } from '@/hooks/useBorrowingEvents';
import RequestCard, { type BorrowingRequest } from '@/components/borrowing/RequestCard';
import ApprovalModal from '@/components/borrowing/ApprovalModal';
import RejectionModal from '@/components/borrowing/RejectionModal';
import { useModal } from '@/context/ModalContext';
import { getBorrowings, approveBorrowing, rejectBorrowing, returnBorrowing } from '@/services/borrowing';
import { fetchInventory } from '@/services/inventory';
import type { Item } from '@/types/inventory';

type TabType = 'pending' | 'active' | 'all';
type StatusFilter = 'all' | 'PENDING' | 'APPROVED' | 'BORROWED' | 'OVERDUE' | 'RETURNED' | 'REJECTED';
type SortOption = 'newest' | 'oldest' | 'due_soonest';

export default function Borrowing() {
    const modal = useModal();
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [requests, setRequests] = useState<BorrowingRequest[]>([]);
    const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal state
    const [approvalModal, setApprovalModal] = useState<{
        isOpen: boolean;
        request: BorrowingRequest | null;
    }>({ isOpen: false, request: null });

    const [rejectionModal, setRejectionModal] = useState<{
        isOpen: boolean;
        request: BorrowingRequest | null;
    }>({ isOpen: false, request: null });

    // Load requests (mock data for now)
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

            // Map database Borrowing objects to BorrowingRequest format
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

    // Calculate stats
    const stats = {
        pendingReview: requests.filter(r => r.status === 'PENDING').length,
        activeLoans: requests.filter(r => r.status === 'APPROVED' || r.status === 'BORROWED').length,
        overdue: requests.filter(r => r.status === 'OVERDUE').length,
        returned: requests.filter(r => r.status === 'RETURNED').length,
    };

    // Filter requests based on active tab
    const getFilteredRequests = () => {
        let filtered = requests;

        // Tab filter
        if (activeTab === 'pending') {
            filtered = filtered.filter(r => r.status === 'PENDING');
        } else if (activeTab === 'active') {
            filtered = filtered.filter(r => ['APPROVED', 'BORROWED', 'OVERDUE'].includes(r.status));
        }

        // Status filter (for "All" tab)
        if (activeTab === 'all' && statusFilter !== 'all') {
            filtered = filtered.filter(r => r.status === statusFilter);
        }

        // Sort
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
    };

    const filteredRequests = getFilteredRequests();

    // Handle approve
    const handleApprove = async (assignedItemId?: number) => {
        if (!approvalModal.request) return;

        setIsLoading(true);
        try {
            await approveBorrowing(approvalModal.request.id, assignedItemId);

            await modal.showSuccess('Request approved successfully!', 'Success');
            setApprovalModal({ isOpen: false, request: null });
            await loadRequests(); // Reload data
        } catch (error) {
            await modal.showError('Failed to approve request', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle reject
    const handleReject = async (reason: string) => {
        if (!rejectionModal.request) return;

        setIsLoading(true);
        try {
            await rejectBorrowing(rejectionModal.request.id, reason);

            await modal.showSuccess('Request rejected and borrower notified', 'Success');
            setRejectionModal({ isOpen: false, request: null });
            await loadRequests(); // Reload data
        } catch (error) {
            await modal.showError('Failed to reject request', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle mark as returned
    const handleMarkReturned = async (id: number) => {
        setIsLoading(true);
        try {
            await returnBorrowing(id);

            await modal.showSuccess('Device marked as returned', 'Success');
            await loadRequests(); // Reload data
        } catch (error) {
            await modal.showError('Failed to update status', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-6 pb-0">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white">Request Management</h1>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <button
                        onClick={() => {
                            setActiveTab('pending');
                            setStatusFilter('all');
                        }}
                        className={`bg-gray-800 rounded-lg p-4 border transition-colors ${activeTab === 'pending'
                            ? 'border-yellow-500/50 bg-yellow-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-lg">
                                <span className="text-2xl">⏳</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Pending Review</p>
                                <p className="text-2xl font-bold text-white">{stats.pendingReview}</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab('active');
                            setStatusFilter('all');
                        }}
                        className={`bg-gray-800 rounded-lg p-4 border transition-colors ${activeTab === 'active'
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-500/20 text-green-400 rounded-lg">
                                <span className="text-2xl">✓</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Active Loans</p>
                                <p className="text-2xl font-bold text-white">{stats.activeLoans}</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab('all');
                            setStatusFilter('OVERDUE');
                        }}
                        className={`bg-gray-800 rounded-lg p-4 border transition-colors ${statusFilter === 'OVERDUE'
                            ? 'border-red-500/50 bg-red-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-500/20 text-red-400 rounded-lg">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Overdue</p>
                                <p className="text-2xl font-bold text-white">{stats.overdue}</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab('all');
                            setStatusFilter('RETURNED');
                        }}
                        className={`bg-gray-800 rounded-lg p-4 border transition-colors ${statusFilter === 'RETURNED'
                            ? 'border-gray-500/50 bg-gray-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-500/20 text-gray-400 rounded-lg">
                                <span className="text-2xl">✓</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Returned</p>
                                <p className="text-2xl font-bold text-white">{stats.returned}</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Tabs and Filters */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-800 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pending'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            ⏳ Pending
                        </button>
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'active'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            ✓ Active
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'all'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            📋 All
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3">
                        {activeTab === 'all' && (
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="all">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="BORROWED">Borrowed</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="RETURNED">Returned</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        )}

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="due_soonest">Due Soonest</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {filteredRequests.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredRequests.map((request) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                variant="admin"
                                onApprove={(id) => {
                                    const req = requests.find(r => r.id === id);
                                    if (req) {
                                        setApprovalModal({ isOpen: true, request: req });
                                    }
                                }}
                                onReject={(id) => {
                                    const req = requests.find(r => r.id === id);
                                    if (req) {
                                        setRejectionModal({ isOpen: true, request: req });
                                    }
                                }}
                                onMarkReturned={handleMarkReturned}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-white mb-2">No requests found</h3>
                        <p className="text-gray-400 text-sm">
                            {activeTab === 'pending'
                                ? 'No pending requests at the moment'
                                : activeTab === 'active'
                                    ? 'No active loans at the moment'
                                    : 'No requests match your filters'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modals */}
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
