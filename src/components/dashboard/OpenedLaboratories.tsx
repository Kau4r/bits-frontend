import { BeakerIcon } from '@heroicons/react/24/outline';

export default function OpenedLaboratories() {
  const labs = [
    { id: 1, name: 'Computer Lab 1', status: 'Open', users: 12 },
    { id: 2, name: 'Physics Lab 2', status: 'Open', users: 8 },
    { id: 3, name: 'Chemistry Lab', status: 'Closed', users: 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {labs.map((lab) => (
          <div key={lab.id} className="flex items-center justify-between p-3 bg-[#1A2236] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-md">
                <BeakerIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{lab.name}</p>
                <p className="text-xs text-gray-200">{lab.status} • {lab.users} users</p>
              </div>
            </div>
            <button className="text-sm font-medium text-green-400 hover:text-green-300">
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
