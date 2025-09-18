import { useState } from 'react';
import LabTechProgressBar from './LabTechProgress';
import LabTechActivities from './LabTechActivities';

type Activity = {
  title: string;
  details: string;
  date: string;
};

type LabTech = {
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

interface Props {
  labTech: LabTech;
}

export default function LabTechDetailPanel({ labTech }: Props) {
  const [activeTab, setActiveTab] = useState('Activities');
  const percentage = labTech.weeklyProgress.totalTasks > 0
    ? Math.round((labTech.weeklyProgress.completedTasks / labTech.weeklyProgress.totalTasks) * 100)
    : 0;

  return (
    <div className="flex-1 overflow-auto gap-4">
      {/* Card header with info */}
      <header className="mb-6 bg-gray-800 rounded-xl shadow p-6 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-blue-900 w-12 h-12 flex items-center justify-center text-2xl font-bold text-white">
            {labTech.name.charAt(0)}
          </span>
          <div>
            <h1 className="text-2xl font-bold">{labTech.name}</h1>
            <p className="text-lg text-blue-200">{labTech.id} &nbsp;|&nbsp; {labTech.department}</p>
            <span
              className={`mt-2 inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                labTech.status === 'Active'
                  ? 'bg-green-600 text-green-100'
                  : 'bg-gray-600 text-gray-200'
              }`}
            >
              {labTech.status}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mb-6 flex border-b border-gray-700 gap-4">
        {['Activities', 'Reports', 'Performance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-2 text-base font-semibold outline-none transition-colors ${
              activeTab === tab
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-blue-300'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-0 h-1 w-12 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === 'Activities' && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Weekly Progress</h2>
          <div className="mb-3">
            <LabTechProgressBar
              completed={labTech.weeklyProgress.completedTasks}
              total={labTech.weeklyProgress.totalTasks}
            />
            <div className="flex justify-between text-gray-400 text-sm mt-1">
              <span>
                {labTech.weeklyProgress.completedTasks}/{labTech.weeklyProgress.totalTasks} tasks
              </span>
              <span>{percentage}%</span>
            </div>
            <p className="mt-2 text-gray-400">
              {labTech.weeklyProgress.totalTasks - labTech.weeklyProgress.completedTasks} tasks remaining to reach weekly target
            </p>
          </div>
          <LabTechActivities activities={labTech.activities} />
        </section>
      )}

      {activeTab !== 'Activities' && (
        <section className="mt-10 text-gray-400 text-center text-lg">
          Content for <span className="font-semibold text-blue-400">{activeTab}</span> coming soon.
        </section>
      )}
    </div>
  );
}
