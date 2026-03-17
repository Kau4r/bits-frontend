import { useState, useEffect, useMemo } from 'react';
import { fetchUsersByRole } from '@/services/user';
import type { User } from '@/types/user';
import { Search } from 'lucide-react';

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
  weeklyProgress: { completedTasks: Math.floor(Math.random() * 10), totalTasks: 10 }, // TODO: Fetch real progress data
  activities: { completed: [], pending: [], inProgress: [] } // TODO: Fetch real activity data
});

export default function LabTechList({ selectedTech, onSelect }: Props) {
  const [labTechs, setLabTechs] = useState<Tech[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredTechs = useMemo(() => {
    return labTechs.filter(tech =>
      tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [labTechs, searchTerm]);

  // Determine workload status color
  const getWorkloadColor = (completed: number, total: number) => {
    const ratio = total > 0 ? completed / total : 0;
    if (ratio < 0.3) return 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-300';
    if (ratio < 0.7) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-300';
    return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-300';
  };

  if (isLoading) {
    return (
      <div className="w-72 space-y-2">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-72 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-300 border border-red-200 dark:border-red-800 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="w-72 flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Search Header */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 sticky top-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Find technician..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-none rounded-lg focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Dense List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1" aria-label="Lab Technicians List">
        {filteredTechs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-8">No matching technicians</p>
        ) : (
          filteredTechs.map((tech) => (
            <div
              key={tech.id}
              onClick={() => onSelect(tech)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(tech);
                }
              }}
              title={tech.name}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border-l-4 ${selectedTech?.id === tech.id
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-indigo-500' // Selected: Indigo Tint + Indigo Bar
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-transparent' // Default: No Bar
                } ${tech.status !== 'Active' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`relative flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${selectedTech?.id === tech.id
                  ? 'bg-indigo-200 text-indigo-700 dark:bg-indigo-500 dark:text-white'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                  {tech.name.charAt(0)}
                  {/* Status Dot */}
                  <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${tech.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                </div>

                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${selectedTech?.id === tech.id
                    ? 'text-indigo-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-200'
                    }`}>
                    {tech.name}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{tech.id}</p>
                </div>
              </div>

              {/* Workload Badge */}
              <div className={`flex items-center px-2 py-0.5 rounded text-[10px] font-medium leading-4 ${getWorkloadColor(tech.weeklyProgress.completedTasks, tech.weeklyProgress.totalTasks)
                }`}>
                <span>{tech.weeklyProgress.completedTasks}/{tech.weeklyProgress.totalTasks}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}