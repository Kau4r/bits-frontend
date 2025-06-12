import { type InventoryItem } from '@/types/inventory'

interface InventoryTableProps {
  items: InventoryItem[]
  onRowClick: (item: InventoryItem) => void
}

const InventoryTable = ({ items, onRowClick }: InventoryTableProps) => {
  return (
    <div className="w-full divide-y divide-gray-200 rounded-lg border dark:divide-gray-700 dark:border-gray-700">
      <div className="w-full overflow-x-auto">
        <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th
                scope="col"
                className="px-6 py-4 text-start text-sm font-medium tracking-wider text-gray-600 uppercase dark:text-gray-300"
              >
                Code
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-start text-sm font-medium tracking-wider text-gray-600 uppercase dark:text-gray-300"
              >
                Brand
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-start text-sm font-medium tracking-wider text-gray-600 uppercase dark:text-gray-300"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-start text-sm font-medium tracking-wider text-gray-600 uppercase dark:text-gray-300"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-start text-sm font-medium tracking-wider text-gray-600 uppercase dark:text-gray-300"
              >
                Location
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-start text-sm font-medium tracking-wider text-gray-600 uppercase dark:text-gray-300"
              >
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <tr
                key={item.assetCode}
                className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => {
                  onRowClick(item)
                }}
              >
                <td className="min-w-[250px] px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-x-5">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-gray-800 dark:text-white">
                        {item.assetCode}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="min-w-[100px] px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                  {item.brand}
                </td>
                <td className="min-w-[120px] px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {item.itemType}
                  </span>
                </td>
                <td className="min-w-[140px] px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                      item.status === 'Available'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : item.status === 'In Use'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : item.status === 'Maintenance'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="min-w-[120px] px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                  {item.location}
                </td>
                <td className="min-w-[140px] px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                  {new Date(item.lastUpdated).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InventoryTable
