import { type InventoryItem } from '@/types/inventory';

interface InventoryTableProps {
  items: InventoryItem[];
}

const InventoryTable = ({ items }: InventoryTableProps) => {
  return (
    <div className="border rounded-lg divide-y divide-gray-200 dark:border-gray-700 dark:divide-gray-700 w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th scope="col" className="px-6 py-4 text-start text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Item</th>
              <th scope="col" className="px-6 py-4 text-start text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Code</th>
              <th scope="col" className="px-6 py-4 text-start text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-4 text-start text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-4 text-start text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Location</th>
              <th scope="col" className="px-6 py-4 text-start text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap min-w-[250px]">
                  <div className="flex items-center gap-x-5">
                    <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800">
                      <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-gray-800 dark:text-white truncate">{item.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 min-w-[100px]">
                  {item.itemCode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                  <span className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                  <span className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium ${
                    item.status === 'Available' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : item.status === 'In Use' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                        : item.status === 'Maintenance' 
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 min-w-[120px]">
                  {item.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 min-w-[140px]">
                  {new Date(item.lastUpdated).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
