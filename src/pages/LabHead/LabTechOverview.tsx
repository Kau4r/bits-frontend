import LabTechList, { type Tech } from '../../components/labhead/LabTechList';
import LabTechDetailPanel from '../../components/labhead/LabTechDetailPanel';
import { useState } from 'react';

export default function LabTechOverview() {
  const [selectedTech, setSelectedTech] = useState<Tech | null>(null);

  return (
    <div className="flex bg-gray-900 text-white sm:p-3 md:p-4 gap-4 h-screen w-full">
      <LabTechList selectedTech={selectedTech} onSelect={setSelectedTech} />
      {selectedTech ? (
        <LabTechDetailPanel labTech={selectedTech} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Select a lab technician to view details
        </div>
      )}
    </div>
  );
}
