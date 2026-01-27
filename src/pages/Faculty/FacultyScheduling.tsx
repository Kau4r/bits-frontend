import Scheduling from '../Scheduling/Scheduling';
import { Bell, LogOut, PlusCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { fetchInventory } from '../../services/inventory';
import type { Item } from '../../types/inventory';
import { getNotifications, type Notification } from '../../services/notifications';
import { createBorrowing } from '../../services/borrowing';
import ReportIssueModal from '../../components/student/Modals/ReportIssue';

const FacultyScheduling = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const modal = useModal();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Report Issue Modal State
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);

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

  const loadItems = async () => {
    setIsLoadingItems(true);
    try {
      const allItems = await fetchInventory();
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
    <div className="flex flex-col h-screen bg-gray-900 relative">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 shadow-sm">
        <div className="w-full px-6">
          <div className="flex justify-between items-center h-18">
            <div className="flex items-center space-x-6">
              <h1 className="text-4xl font-bold text-[#4338CA]">BITS</h1>
              <div className="text-gray text-lg">
                Hello, <span className="text-gray font-medium">{facultyName}</span>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <button
                onClick={() => setShowReportIssueModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
              >
                <span>🚨</span>
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
                  className="p-1 rounded-full text-gray-400 hover:text-white transition-colors focus:outline-none"
                >
                  <Bell className="h-6 w-6" />
                </button>
                {isNotificationOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm font-medium text-white">Notifications</p>
                      </div>
                      {isLoadingNotifications ? (
                        <div className="px-4 py-3 text-sm text-gray-400">Loading...</div>
                      ) : notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div key={notification.id} className={`px-4 py-3 hover:bg-gray-700 ${!notification.read ? 'border-l-2 border-indigo-500' : ''}`}>
                            <p className="text-sm font-medium text-white">{notification.title}</p>
                            <p className="text-sm text-gray-300">{notification.message || 'No details'}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatTime(notification.timestamp)}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-400">No new notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-gray-700 space-x-2"
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">📱 Request a Device</h2>
                <p className="text-sm text-gray-400 mt-1">Fill out the form below to request a device. Your request will be reviewed by the department admin.</p>
              </div>
              <button onClick={() => setIsBorrowModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

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
                  expectedReturnDate: returnDateTime.toISOString()
                });

                modal.showSuccess('Borrowing request submitted! A Lab Tech will assign a specific item.', 'Success');
                setIsBorrowModalOpen(false);
                setSelectedType(''); // Reset form
              } catch (error: any) {
                console.error('Borrowing error:', error);
                modal.showError(error.response?.data?.error || 'Failed to submit borrowing request', 'Error');
              }
            }} className="space-y-5">
              {/* Item Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Item Type <span className="text-red-400">*</span>
                </label>
                {isLoadingItems ? (
                  <div className="text-sm text-gray-400">Loading available items...</div>
                ) : (
                  <>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select an item type</option>
                      {uniqueTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {selectedType && (
                      <p className="text-xs text-green-400 mt-1">
                        ✓ {inventoryItems.filter(item => item.Item_Type === selectedType).length} {selectedType}(s) available - Lab Tech will assign a specific item
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Borrow Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Borrow Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    name="borrowDate"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Borrow Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    name="borrowTime"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Return Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Return Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    name="returnDate"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Return Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    name="returnTime"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Purpose / Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Purpose / Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="purpose"
                  required
                  rows={3}
                  placeholder="Briefly describe why you need this device..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2.5 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingItems}
                  className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
        onSubmit={async (description, issueType, equipment) => {
          console.log('Report Issue:', { description, issueType, equipment });
          modal.showSuccess('Issue reported successfully', 'Success');
        }}
        room="General Facility"
        pcNumber="N/A"
      />
    </div>
  );
};

export default FacultyScheduling;
