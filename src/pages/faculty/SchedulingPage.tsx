import Scheduling from '@/pages/scheduling/SchedulingPage';
import { Bell, LogOut, PlusCircle, AlertTriangle, X, Package, Calendar, Clock, MapPin, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useNotifications } from '@/context/NotificationContext';
import { getInventory } from '@/services/inventory';
import type { Item } from '@/types/inventory';
import { getRooms } from '@/services/room';
import type { Room } from '@/types/room';
import { getNotifications, type Notification } from '@/services/notifications';
import { createBorrowing } from '@/services/borrowing';
import { getBookings } from '@/services/booking';
import ReportIssueModal from '@/pages/student/components/ReportIssue';
import { useBorrowingEvents } from '@/hooks/useBorrowingEvents';
import { createTicket } from '@/services/tickets';
import { buildTicketLocation } from '@/lib/ticketLocation';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { formatItemType } from '@/lib/utils';

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeInput = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getBorrowDefaults = () => {
  const borrow = new Date();
  borrow.setSeconds(0, 0);
  const expectedReturn = new Date(borrow.getTime() + 60 * 60 * 1000);

  return {
    borrowDate: formatDateInput(borrow),
    borrowTime: formatTimeInput(borrow),
    returnDate: formatDateInput(expectedReturn),
    returnTime: formatTimeInput(expectedReturn),
  };
};

const FacultyScheduling = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const modal = useModal();
  const { notifications: liveNotifications, unreadCount, markAsRead } = useNotifications();
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
  const [borrowSchedule, setBorrowSchedule] = useState(getBorrowDefaults);
  const [borrowRooms, setBorrowRooms] = useState<Room[]>([]);
  const [selectedBorrowRoomId, setSelectedBorrowRoomId] = useState<number | ''>('');

  // Fetch items + rooms when modal opens
  useEffect(() => {
    if (isBorrowModalOpen) {
      loadItems();
      loadBorrowRooms();
      setSelectedType(''); // Reset type
      setSelectedBorrowRoomId('');
      setBorrowSchedule(getBorrowDefaults());
    }
  }, [isBorrowModalOpen]);

  const loadBorrowRooms = async () => {
    try {
      const rooms = await getRooms();
      // Restrict to bookable rooms; faculty borrowing usually targets the
      // room they're teaching/working in, not storage/control rooms.
      setBorrowRooms(rooms.filter(r => r.Is_Bookable !== false));
    } catch (error) {
      console.error('Failed to load rooms', error);
    }
  };

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
        item.IsBorrowable !== false &&
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

  const handleBorrowDateTimeChange = (field: 'borrowDate' | 'borrowTime', value: string) => {
    setBorrowSchedule(prev => {
      const next = { ...prev, [field]: value };
      const borrowDateTime = new Date(`${next.borrowDate}T${next.borrowTime}`);

      if (Number.isNaN(borrowDateTime.getTime())) {
        return next;
      }

      const expectedReturn = new Date(borrowDateTime.getTime() + 60 * 60 * 1000);
      return {
        ...next,
        returnDate: formatDateInput(expectedReturn),
        returnTime: formatTimeInput(expectedReturn),
      };
    });
  };



  const facultyName = user ? `${user.First_Name} ${user.Last_Name}` : "Faculty Member";

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isNotificationOpen && notifications.length === 0) {
      loadNotifications();
    }
  }, [isNotificationOpen]);

  useEffect(() => {
    setNotifications(liveNotifications.slice(0, 10));
  }, [liveNotifications]);

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
    <div className="relative flex h-screen flex-col bg-[#f4f7fa] dark:bg-[#101828]">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm dark:bg-[#1e2939]">
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

      <div className="flex-1 overflow-hidden">
        <Scheduling showRejectedMyBookings />
      </div>


      {/* Enhanced Device Borrowing Request Modal */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={() => setIsBorrowModalOpen(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-white px-6 py-5 dark:border-white/10 dark:from-indigo-500/10 dark:to-transparent">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Request a Device</h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">A Lab Tech will review and assign a specific item.</p>
                </div>
              </div>
              <button
                onClick={() => setIsBorrowModalOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
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
              if (!selectedType || !borrowDate || !borrowTime || !returnDate || !returnTime || !purpose.trim() || !selectedBorrowRoomId) {
                modal.showError('Please fill in all required fields, including the room.', 'Validation Error');
                return;
              }

              const borrowDateTime = new Date(`${borrowDate}T${borrowTime}`);
              const returnDateTime = new Date(`${returnDate}T${returnTime}`);

              if (returnDateTime <= borrowDateTime) {
                modal.showError(
                  'The return date and time need to come after the borrow date and time. Please pick a return that is later than when you start borrowing.',
                  'Check your borrow window'
                );
                return;
              }

              // Check if there are any items of this type available
              const availableCount = inventoryItems.filter(item => item.Item_Type === selectedType).length;
              if (availableCount === 0) {
                modal.showError(`No ${formatItemType(selectedType)} items currently available`, 'Validation Error');
                return;
              }

              // Call the borrowing API with itemType (Lab Tech will assign specific item)
              try {
                await createBorrowing({
                  itemType: selectedType,
                  purpose,
                  borrowDate: borrowDateTime.toISOString(),
                  expectedReturnDate: returnDateTime.toISOString(),
                  roomId: typeof selectedBorrowRoomId === 'number' ? selectedBorrowRoomId : undefined,
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
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                {/* Item + Room — side by side */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">What & where</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col">
                      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        Item Type <span className="text-rose-500">*</span>
                      </label>
                      {isLoadingItems ? (
                        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">Loading available items…</div>
                      ) : (
                        <FloatingSelect
                          id="faculty-borrow-item-type"
                          value={selectedType}
                          placeholder="Select an item type"
                          options={uniqueTypes.map((type) => ({ value: type, label: formatItemType(type) }))}
                          onChange={setSelectedType}
                        />
                      )}
                      {selectedType && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          ✓ {inventoryItems.filter(item => item.Item_Type === selectedType).length} {formatItemType(selectedType)}{inventoryItems.filter(item => item.Item_Type === selectedType).length === 1 ? '' : 's'} available
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        Room <span className="text-rose-500">*</span>
                      </label>
                      <FloatingSelect
                        id="faculty-borrow-room"
                        value={selectedBorrowRoomId === '' ? '' : selectedBorrowRoomId}
                        placeholder="Where you'll use the item"
                        options={borrowRooms.map((room) => ({ value: room.Room_ID, label: room.Name }))}
                        onChange={(value) => setSelectedBorrowRoomId(typeof value === 'number' ? value : Number(value))}
                      />
                    </div>
                  </div>
                </section>

                {/* Borrow window */}
                <section>
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    Borrow window
                  </h3>
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_1fr_1fr]">
                      <div className="flex flex-col">
                        <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Borrow Date</label>
                        <input
                          type="date"
                          name="borrowDate"
                          required
                          min={formatDateInput(new Date())}
                          value={borrowSchedule.borrowDate}
                          onChange={(event) => handleBorrowDateTimeChange('borrowDate', event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Borrow Time</label>
                        <input
                          type="time"
                          name="borrowTime"
                          required
                          value={borrowSchedule.borrowTime}
                          onChange={(event) => handleBorrowDateTimeChange('borrowTime', event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                        />
                      </div>
                      <div className="hidden items-end justify-center pb-2 text-slate-400 sm:flex">
                        <span className="text-lg font-bold">→</span>
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Return Date</label>
                        <input
                          type="date"
                          name="returnDate"
                          required
                          min={borrowSchedule.borrowDate || formatDateInput(new Date())}
                          value={borrowSchedule.returnDate}
                          onChange={(event) => setBorrowSchedule(prev => ({ ...prev, returnDate: event.target.value }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Return Time</label>
                        <input
                          type="time"
                          name="returnTime"
                          required
                          value={borrowSchedule.returnTime}
                          onChange={(event) => setBorrowSchedule(prev => ({ ...prev, returnTime: event.target.value }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                        />
                      </div>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      Default duration is 1 hour. Adjust the return time as needed.
                    </p>
                  </div>
                </section>

                {/* Purpose / Reason */}
                <section>
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <FileText className="h-3.5 w-3.5" />
                    Purpose
                  </h3>
                  <textarea
                    name="purpose"
                    required
                    rows={3}
                    placeholder="Briefly describe why you need this device…"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white dark:placeholder:text-slate-500"
                  />
                </section>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                  <span className="text-rose-500">*</span> required
                </p>
                <div className="flex flex-1 items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBorrowModalOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoadingItems}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Submit Request
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
        onSubmit={async (description, issueType, equipment, pcNumber, noRoom) => {
          if (!user?.User_ID) return;

          const categoryMap: Record<string, 'HARDWARE' | 'SOFTWARE' | 'FACILITY' | 'OTHER'> = {
            hardware: 'HARDWARE',
            software: 'SOFTWARE',
            network: 'FACILITY',
            other: 'OTHER',
          };

          const targetRoomName = noRoom ? '' : currentRoom;

          await createTicket({
            Reported_By_ID: user.User_ID,
            Report_Problem: description,
            Location: buildTicketLocation({ equipment, pcLabel: pcNumber, roomName: targetRoomName }),
            Room_ID: noRoom ? null : undefined,
            Category: categoryMap[issueType] ?? 'OTHER',
            Status: 'PENDING',
          });

          modal.showSuccess(
            noRoom
              ? 'Ticket submitted. A Lab Tech will be notified.'
              : `Ticket submitted for ${currentRoom}. A Lab Tech will be notified.`,
            'Issue Reported'
          );
        }}
        room={currentRoom}
        pcNumber="N/A"
      />
    </div>
  );
};

export default FacultyScheduling;
