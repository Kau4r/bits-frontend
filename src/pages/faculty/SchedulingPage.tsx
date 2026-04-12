import Scheduling from '@/pages/scheduling/SchedulingPage';
import { Bell, LogOut, PlusCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useNotifications } from '@/context/NotificationContext';
import { getInventory } from '@/services/inventory';
import type { Item } from '@/types/inventory';
import { getNotifications, type Notification } from '@/services/notifications';
import { createBorrowing } from '@/services/borrowing';
import { getBookings } from '@/services/booking';
import ReportIssueModal from '@/pages/student/components/ReportIssue';
import { useBorrowingEvents } from '@/hooks/useBorrowingEvents';
import { createTicket } from '@/services/tickets';

const FacultyScheduling = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const modal = useModal();
  const { unreadCount, markAsRead } = useNotifications();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Report Issue Modal State
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string>('General Facility');

  // Borrow Modal State
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Fetch items when modal opens
  useEffect(() => {
    if (isBorrowModalOpen) {
      loadItems();
      setSelectedType(''); // Reset type
    }
  }, [isBorrowModalOpen]);

  // Fetch current active booking for room context
  useEffect(() => {
    const fetchCurrentRoomContext = async () => {
      if (!user) return;
      try {
        const bookings = await getBookings();
        const now = new Date();
        const activeBooking = bookings.find((b: any) =>
          b.User_ID === user.User_ID &&
          b.Status === 'APPROVED' &&
          new Date(b.Start_Time) <= now &&
          new Date(b.End_Time) >= now
        );

        if (activeBooking && activeBooking.Room) {
          setCurrentRoom(activeBooking.Room.Name);
        } else {
          setCurrentRoom('General Facility');
        }
      } catch (err) {
        console.error("Failed to fetch current room context:", err);
      }
    };

    if (showReportIssueModal) {
      fetchCurrentRoomContext();
    }
  }, [showReportIssueModal, user]);

  const loadItems = async () => {
    setIsLoadingItems(true);
    try {
      const allItems = await getInventory();
      // Filter for Available Items only (exclude computers)
      const availableItems = allItems.filter((item: any) =>
        item.Item_Type &&
        item.Status === 'AVAILABLE' &&
        item.Item_ID
      ) as Item[];
      setInventoryItems(availableItems);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Derived state for types
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(inventoryItems.map(item => item.Item_Type))).sort();
  }, [inventoryItems]);

  const handleLogout = async () => {
    console.log('Logging out...');
    await logout();
    navigate('/login');
  };



  const facultyName = user ? `${user.First_Name} ${user.Last_Name}` : "Faculty Member";

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isNotificationOpen && notifications.length === 0) {
      loadNotifications();
    }
  }, [isNotificationOpen]);

  const loadNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const data = await getNotifications({ limit: 10 });
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.read) return;

    const readAt = new Date().toISOString();
    setNotifications(prev => prev.map(item =>
      item.id === notification.id ? { ...item, read: true, readAt } : item
    ));

    try {
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(prev => prev.map(item =>
        item.id === notification.id ? { ...item, read: false, readAt: null } : item
      ));
    }
  };

  // Real-time updates for notifications
  useBorrowingEvents(() => {
    console.log('Received borrowing update, refreshing notifications...');
    loadNotifications();
    // Also refresh child components if needed by triggering a refetch or state update they listen to
    // MyBorrowingRequests handles its own refresh? No, it needs a signal or we can force remount
    // Actually, MyBorrowingRequests should also use the hook.
    // For now, refreshing notifications ensures the bell updates.
  });

  // Helper to format relative time
  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="w-full px-6">
          <div className="flex justify-between items-center h-18">
            <div className="flex items-center space-x-6">
              <h1 className="text-4xl font-bold text-[#4338CA]">BITS</h1>
              <div className="text-gray-900 dark:text-gray-200 text-lg">
                Hello, <span className="text-gray-900 dark:text-gray-200 font-medium">{facultyName}</span>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <button
                onClick={() => setShowReportIssueModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                title="Report an Issue"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Report Issue</span>
              </button>

              {/* Test Borrow Button */}
              <button
                onClick={() => setIsBorrowModalOpen(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                title="Test Borrow Item"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Borrow</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="relative p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none"
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-800">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {isNotificationOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Notifications</p>
                      </div>
                      {isLoadingNotifications ? (
                        <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Loading...</div>
                      ) : notifications.length > 0 ? (
                        notifications.map(notification => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className={`block w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${!notification.read ? 'border-l-2 border-indigo-500' : ''}`}
                            title={notification.read ? 'Notification already read' : 'Mark notification as read'}
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                            <p className="text-sm text-gray-800 dark:text-gray-300">{notification.message || 'No details'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTime(notification.timestamp)}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">No new notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 space-x-2"
                  title="Log out"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden p-4">
        <Scheduling />
      </div>


      {/* Enhanced Device Borrowing Request Modal */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setIsBorrowModalOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">📱 Request a Device</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fill out the form below to request a device. Your request will be reviewed by the department admin.</p>
              </div>
              <button
                onClick={() => setIsBorrowModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body + Footer wrapped in form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const borrowDate = formData.get('borrowDate') as string;
              const borrowTime = formData.get('borrowTime') as string;
              const returnDate = formData.get('returnDate') as string;
              const returnTime = formData.get('returnTime') as string;
              const purpose = formData.get('purpose') as string;

              // Validation - only need item type now, not specific item
              if (!selectedType || !borrowDate || !borrowTime || !returnDate || !returnTime || !purpose.trim()) {
                modal.showError('Please fill in all required fields', 'Validation Error');
                return;
              }

              const borrowDateTime = new Date(`${borrowDate}T${borrowTime}`);
              const returnDateTime = new Date(`${returnDate}T${returnTime}`);

              if (returnDateTime <= borrowDateTime) {
                modal.showError('Return date/time must be after borrow date/time', 'Validation Error');
                return;
              }

              // Check if there are any items of this type available
              const availableCount = inventoryItems.filter(item => item.Item_Type === selectedType).length;
              if (availableCount === 0) {
                modal.showError(`No ${selectedType} items currently available`, 'Validation Error');
                return;
              }

              // Call the borrowing API with itemType (Lab Tech will assign specific item)
              try {
                await createBorrowing({
                  itemType: selectedType,
                  purpose,
                  borrowDate: borrowDateTime.toISOString(),
                  expectedReturnDate: returnDateTime.toISOString()
                });

                modal.showSuccess('Borrowing request submitted! A Lab Tech will assign a specific item.', 'Success');
                setIsBorrowModalOpen(false);
                setSelectedType(''); // Reset form
              } catch (error: any) {
                console.error('Borrowing error:', error);
                modal.showError(error.response?.data?.error || 'Failed to submit borrowing request', 'Error');
              }
            }} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Item Type */}
                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Item Type <span className="text-red-500">*</span>
                  </label>
                  {isLoadingItems ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Loading available items...</div>
                  ) : (
                    <>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select an item type</option>
                        {uniqueTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {selectedType && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ {inventoryItems.filter(item => item.Item_Type === selectedType).length} {selectedType}(s) available - Lab Tech will assign a specific item
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Borrow Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Borrow Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="borrowDate"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Borrow Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="borrowTime"
                      required
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Return Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Return Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="returnDate"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Return Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="returnTime"
                      required
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Purpose / Reason */}
                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Purpose / Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="purpose"
                    required
                    rows={3}
                    placeholder="Briefly describe why you need this device..."
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingItems}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
        onSubmit={async (description, issueType, equipment, pcNumber) => {
          if (!user?.User_ID) return;

          const categoryMap: Record<string, 'HARDWARE' | 'SOFTWARE' | 'FACILITY' | 'OTHER'> = {
            hardware: 'HARDWARE',
            software: 'SOFTWARE',
            network: 'FACILITY',
            other: 'OTHER',
          };

          await createTicket({
            Reported_By_ID: user.User_ID,
            Report_Problem: description,
            Location: `${equipment} — PC: ${pcNumber} | Room: ${currentRoom}`,
            Category: categoryMap[issueType] ?? 'OTHER',
            Status: 'PENDING',
          });

          modal.showSuccess(`Ticket submitted for ${currentRoom}. A Lab Tech will be notified.`, 'Issue Reported');
        }}
        room={currentRoom}
        pcNumber="N/A"
      />
    </div>
  );
};

export default FacultyScheduling;
