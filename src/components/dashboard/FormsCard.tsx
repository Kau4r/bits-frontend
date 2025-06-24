import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function FormsCard() {
  const forms = [
    { id: 1, name: 'Lab Equipment Request', submissions: 24 },
    { id: 2, name: 'Maintenance Report', submissions: 18 },
    { id: 3, name: 'Incident Report', submissions: 5 },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {forms.map((form) => (
          <div key={form.id} className="flex items-center justify-between p-3 bg-[#1A2236] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-md">
                <DocumentTextIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{form.name}</p>
                <p className="text-xs text-white">{form.submissions} submissions</p>
              </div>
            </div>
            <button className="text-sm font-medium600 hover:text-gray-400">
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
