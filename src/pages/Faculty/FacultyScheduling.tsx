import Scheduling from '../Scheduling/Scheduling';
import { Bell, LogOut, PlusCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { createBorrowing } from '../../services/borrowing';
import { fetchInventory } from '../../services/inventory';
import type { Item } from '../../types/inventory';
import { getNotifications, type Notification } from '../../services/notifications';

const FacultyScheduling = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const modal = useModal();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Borrow Modal State
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Fetch items when modal opens
  useEffect(() => {
    if (isBorrowModalOpen) {
      loadItems();
      setSelectedType(''); // Reset type
      setSelectedItemId(''); // Reset item
    }
  }, [isBorrowModalOpen]);

  // Reset item selection when type changes
  useEffect(() => {
    setSelectedItemId('');
  }, [selectedType]);

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

  // Derived state for types and filtered items
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(inventoryItems.map(item => item.Item_Type))).sort();
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    if (!selectedType) return [];
    return inventoryItems.filter(item => item.Item_Type === selectedType);
  }, [inventoryItems, selectedType]);

  const handleLogout = async () => {
    console.log('Logging out...');
    await logout();
    navigate('/login');
  };

  const handleConfirmBorrow = async () => {
    if (!user || !selectedItemId) return;

    const itemId = parseInt(selectedItemId);
    if (isNaN(itemId)) return;

    try {
      const result = await createBorrowing({
        borrowerId: user.User_ID,
        borroweeId: undefined,
        items: [{ itemId, quantity: 1 }],
        type: 'ITEM',
        purpose: 'Faculty Test Borrow',
        expectedReturnDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      await modal.showSuccess(`Borrowing Success! Borrowing ID: ${result.Borrow_Item_ID}`, 'Success');
      setIsBorrowModalOpen(false);
    } catch (error: any) {
      console.error(error);
      await modal.showError(error.response?.data?.error || error.message, 'Borrowing Failed');
    }
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

              {/* Test Borrow Button */}
              <button
                onClick={() => setIsBorrowModalOpen(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                title="Test Borrow Item"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Test Borrow</span>
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

      {/* Borrow Modal */}
      {isBorrowModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Borrow Item</h2>
              <button onClick={() => setIsBorrowModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  1. Select Item Type
                </label>
                {isLoadingItems ? (
                  <div className="text-sm text-gray-400">Loading inventory...</div>
                ) : (
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Type --</option>
                    {uniqueTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Item Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  2. Select Item
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  disabled={!selectedType}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Specific Item --</option>
                  {filteredItems.map((item) => (
                    <option key={item.Item_ID} value={item.Item_ID}>
                      {item.Brand} ({item.Item_Code})
                    </option>
                  ))}
                </select>
                {!selectedType && (
                  <p className="text-xs text-gray-500 mt-1">Please select a type first.</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBorrow}
                  disabled={!selectedItemId || isLoadingItems}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Borrow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyScheduling;