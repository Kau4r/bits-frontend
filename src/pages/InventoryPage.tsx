import { useState } from 'react';
import { type InventoryItem } from '@/types/inventory';
import { PlusIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import InventoryTable from '@/components/inventory/InventoryTable';

const mockInventory: InventoryItem[] = [
  { id: '1', itemCode: 'RM-101', name: 'Conference Room', description: 'Main conference room with projector', location: 'Floor 1', type: 'Equipment', status: 'Available', lastUpdated: '2023-06-02' },
  { id: '2', itemCode: 'RM-102', name: 'Meeting Room A', description: 'Small meeting room for 4 people', location: 'Floor 2', type: 'Equipment', status: 'In Use', lastUpdated: '2023-06-01', assignedTo: 'John Doe' },
  { id: '3', itemCode: 'RM-103', name: 'Meeting Room B', description: 'Medium meeting room for 6 people', location: 'Floor 2', type: 'Equipment', status: 'Maintenance', lastUpdated: '2023-05-30' },
  { id: '4', itemCode: 'RM-104', name: 'Quiet Room', description: 'Soundproof room for focused work', location: 'Floor 3', type: 'Equipment', status: 'Disposed', lastUpdated: '2023-05-28' },
];


const InventoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType] = useState('All Types');
  const [selectedStatus] = useState('All Status');

  const filteredInventory = mockInventory.filter(item =>
    (item.name + item.itemCode).toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedType === 'All Types' || item.type === selectedType) &&
    (selectedStatus === 'All Status' || item.status === selectedStatus)
  );

  return (
    <div className="px-6 sm:px-8 lg:px-10 py-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
        <button
          className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Item
        </button>
      </div>

      <div className="flex items-end justify-between gap-6 mb-8">
        {/* Search input (left side) */}
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search
          </label>
          <input
            type="text"
            id="search"
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters (right side) */}
        <div className="flex gap-3">
          <button className="py-2.5 px-4 flex items-center gap-2 text-base rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800">
            Sort By
            <ChevronDownIcon className="w-5 h-5" />
          </button>
          <button className="py-2.5 px-4 flex items-center gap-2 text-base rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800">
            {selectedType}
            <ChevronDownIcon className="w-5 h-5" />
          </button>
          <button className="py-2.5 px-4 flex items-center gap-2 text-base rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800">
            {selectedStatus}
            <ChevronDownIcon className="w-5 h-5" />
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
