import { useState } from 'react';
import { type InventoryItem, type InventoryStatus, type InventoryType } from '@/types/inventory';
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import InventoryTable from '@/components/inventory/InventoryTable';

const mockInventory: InventoryItem[] = [
  { id: '1', itemCode: 'RM-101', name: 'Conference Room', description: 'Main conference room with projector', location: 'Floor 1', type: 'Equipment', status: 'Available', lastUpdated: '2023-06-02' },
  { id: '2', itemCode: 'RM-102', name: 'Meeting Room A', description: 'Small meeting room for 4 people', location: 'Floor 2', type: 'Equipment', status: 'In Use', lastUpdated: '2023-06-01', assignedTo: 'John Doe' },
  { id: '3', itemCode: 'RM-103', name: 'Meeting Room B', description: 'Medium meeting room for 6 people', location: 'Floor 2', type: 'Equipment', status: 'Maintenance', lastUpdated: '2023-05-30' },
  { id: '4', itemCode: 'RM-104', name: 'Quiet Room', description: 'Soundproof room for focused work', location: 'Floor 3', type: 'Equipment', status: 'Disposed', lastUpdated: '2023-05-28' },
];

const statusOptions: InventoryStatus[] = ['Available', 'In Use', 'Maintenance', 'Disposed'];
const typeOptions: InventoryType[] = ['Equipment', 'Consumable', 'Tool', 'Other'];

const InventoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const filteredInventory = mockInventory.filter(item =>
    (item.name + item.itemCode).toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedType === 'All Types' || item.type === selectedType) &&
    (selectedStatus === 'All Status' || item.status === selectedStatus)
  );

  return (
    <div className="w-full px-4 py-4 lg:py-12">
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
          <button className="py-2 px-3 flex items-center gap-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            <PlusIcon className="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full py-2 pl-11 pr-4 rounded-lg text-sm border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button className="py-2 px-3 flex items-center gap-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800">
            Sort By
            <ChevronDownIcon className="w-4 h-4" />
          </button>

          <button className="py-2 px-3 flex items-center gap-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800">
            {selectedType}
            <ChevronDownIcon className="w-4 h-4" />
          </button>

          <button className="py-2 px-3 flex items-center gap-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800">
            {selectedStatus}
            <FunnelIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <InventoryTable
        items={filteredInventory}
      />
    </div>
  );
};

export default InventoryPage;
