import { ChartBarIcon, DocumentChartBarIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

const reports = [
  {
    id: 1,
    name: 'Monthly Usage Report',
    type: 'PDF',
    size: '2.4 MB',
    icon: DocumentChartBarIcon,
  },
  {
    id: 2,
    name: 'Equipment Status',
    type: 'Excel',
    size: '1.8 MB',
    icon: ChartBarIcon,
  },
  {
    id: 3,
    name: 'Audit Report',
    type: 'PDF',
    size: '3.1 MB',
    icon: DocumentMagnifyingGlassIcon,
  },
];

export default function ReportsCard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm font-medium text-green-400 hover:text-green-300">
          Generate New
        </button>
      </div>
      <div className="space-y-3">
        {reports.map((report) => (
          <div key={report.id} className="flex items-center justify-between p-3 bg-[#1A2236] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-md">
                <report.icon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{report.name}</p>
                <p className="text-xs text-gray-200">{report.type} • {report.size}</p>
              </div>
            </div>
            <button className="text-sm font-medium text-green-400 hover:text-green-300">
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
