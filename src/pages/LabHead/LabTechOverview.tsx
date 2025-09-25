import LabTechList from '../../components/labhead/LabTechList';
import LabTechDetailPanel from '../../components/labhead/LabTechDetailPanel';
import { useState } from 'react';

export type Activity = {
  title: string;
  details: string;
  date: string;
};

export type Tech = {
  id: string;
  name: string;
  department: string;
  status: string;
  weeklyProgress: { completedTasks: number; totalTasks: number };
  activities: {
    completed: Activity[];
    pending: Activity[];
    inProgress: Activity[];
  };
};

const initialTech: Tech = {
  id: 'LT001',
  name: 'Alex Johnson',
  department: 'Computer Lab',
  status: 'Active',
  weeklyProgress: { completedTasks: 0, totalTasks: 10 },
  activities: {
    completed: [],
    pending: [],
    inProgress: []
  }
};

export default function LabTechOverview() {
  const [selectedTech, setSelectedTech] = useState<Tech>(initialTech);

  return (
    <div className="flex bg-gray-900 text-white sm:p-3 md:p-4 gap-4 h-screen w-full">
      <LabTechList selectedTech={selectedTech} onSelect={setSelectedTech} />
      <LabTechDetailPanel labTech={selectedTech} />
    </div>
  );
}
