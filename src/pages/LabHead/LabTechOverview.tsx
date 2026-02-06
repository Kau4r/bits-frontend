import LabTechList, { type Tech } from '../../components/labhead/LabTechList';
import LabTechDetailPanel from '../../components/labhead/LabTechDetailPanel';
import { useState } from 'react';

export default function LabTechOverview() {
  const [selectedTech, setSelectedTech] = useState<Tech | null>(null);

  return (
    <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Technicians</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and view lab technician details and assignments</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <LabTechList selectedTech={selectedTech} onSelect={setSelectedTech} />
        {selectedTech ? (
          <div className="flex-1 min-w-0">
            <LabTechDetailPanel labTech={selectedTech} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
            Select a lab technician to view details
          </div>
        )}
      </div>
    </div>
  );
}
