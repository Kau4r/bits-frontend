import { useState, useEffect } from 'react';
import { fetchUsersByRole } from '@/services/user';
import type { User } from '@/types/user';

export type Tech = {
  dbId: number;
  id: string;
  name: string;
  email: string;
  status: string;
  weeklyProgress: { completedTasks: number; totalTasks: number };
  activities: {
    completed: Array<{ title: string; details: string; date: string }>;
    pending: Array<{ title: string; details: string; date: string }>;
    inProgress: Array<{ title: string; details: string; date: string }>;
  };
};

interface Props {
  selectedTech: Tech | null;
  onSelect: (tech: Tech) => void;
}

// Convert backend User to component Tech type
const mapUserToTech = (user: User): Tech => ({
  dbId: user.User_ID,
  id: `LT${user.User_ID.toString().padStart(3, '0')}`,
  name: `${user.First_Name} ${user.Last_Name}`,
  email: user.Email,
  status: user.Is_Active ? 'Active' : 'Inactive',
  weeklyProgress: { completedTasks: 0, totalTasks: 10 }, // TODO: Fetch real progress data
  activities: { completed: [], pending: [], inProgress: [] } // TODO: Fetch real activity data
});

export default function LabTechList({ selectedTech, onSelect }: Props) {
  const [labTechs, setLabTechs] = useState<Tech[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLabTechs = async () => {
      try {
        setIsLoading(true);
        const users = await fetchUsersByRole('LAB_TECH');
        const techs = users.map(mapUserToTech);
        setLabTechs(techs);

        // Auto-select first tech if none selected
        if (techs.length > 0 && !selectedTech) {
          onSelect(techs[0]);
        }
      } catch (err) {
        console.error('Failed to fetch lab techs:', err);
        setError('Failed to load lab technicians');
      } finally {
        setIsLoading(false);
      }
    };

    loadLabTechs();
  }, []);

  if (isLoading) {
    return (
      <nav className="rounded-md w-64 bg-gray-800 p-4">
        <h2 className="text-xl font-semibold mb-4 text-white">Lab Technicians</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </nav>
    );
  }

  if (error) {
    return (
      <nav className="rounded-md w-64 bg-gray-800 p-4">
        <h2 className="text-xl font-semibold mb-4 text-white">Lab Technicians</h2>
        <p className="text-red-400 text-sm">{error}</p>
      </nav>
    );
  }

  return (
    <nav className="rounded-md w-64 bg-gray-800 p-4 space-y-4" aria-label="Lab Technicians">
      <h2 className="text-xl font-semibold mb-4 text-white">Lab Technicians</h2>

      {labTechs.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No lab technicians found</p>
      ) : (
        <ul className="space-y-2" role="list">
          {labTechs.map((tech) => (
            <li
              key={tech.id}
              onClick={() => onSelect(tech)}
              tabIndex={0}
              role="listitem"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(tech);
                }
              }}
              title={tech.name}
              className={`cursor-pointer rounded-md p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectedTech?.id === tech.id
                ? 'bg-blue-900 text-white'
                : 'text-gray-300 hover:bg-gray-700'
                } ${tech.status !== 'Active' ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-gray-600 w-8 h-8 flex items-center justify-center text-sm text-white select-none">
                  {tech.name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{tech.name}</p>
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${tech.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      aria-hidden="true"
                    />
                    <p className="text-xs text-gray-400 truncate">{tech.status}</p>
                  </div>
                </div>
              </div>
              <div className="mt-1 w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${tech.weeklyProgress.totalTasks > 0
                      ? (tech.weeklyProgress.completedTasks / tech.weeklyProgress.totalTasks) * 100
                      : 0}%`,
                    minWidth: '0.375rem'
                  }}
                />
              </div>
              <p className="text-xs text-right mt-1 text-gray-400 select-none">
                {tech.weeklyProgress.completedTasks}/{tech.weeklyProgress.totalTasks} tasks
              </p>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}