type Tech = {
    id: string;
    name: string;
    department: string;
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
  
  const labTechs: Tech[] = [
    { 
      id: 'LT001', 
      name: 'Alex Johnson',
      department: 'Computer Lab',
      status: 'Active',
      weeklyProgress: { completedTasks: 7, totalTasks: 10 },
      activities: { completed: [], pending: [], inProgress: [] }
    },
    { 
      id: 'LT002', 
      name: 'Maria Garcia',
      department: 'Computer Lab',
      status: 'Active',
      weeklyProgress: { completedTasks: 5, totalTasks: 10 },
      activities: { completed: [], pending: [], inProgress: [] }
    },
    { 
      id: 'LT003', 
      name: 'James Wilson',
      department: 'Computer Lab',
      status: 'Active',
      weeklyProgress: { completedTasks: 3, totalTasks: 10 },
      activities: { completed: [], pending: [], inProgress: [] }
    },
    { 
      id: 'LT004', 
      name: 'Sarah Chen',
      department: 'Computer Lab',
      status: 'Inactive',
      weeklyProgress: { completedTasks: 0, totalTasks: 10 },
      activities: { completed: [], pending: [], inProgress: [] }
    },
    { 
      id: 'LT005', 
      name: 'David Kim',
      department: 'Computer Lab',
      status: 'Active',
      weeklyProgress: { completedTasks: 9, totalTasks: 10 },
      activities: { completed: [], pending: [], inProgress: [] }
    },
  ];
  
  
  export default function LabTechList({ selectedTech, onSelect }: Props) {
    return (
      <nav className=" rounded-md w-64 bg-gray-800 p-4 space-y-4" aria-label="Lab Technicians">
        <h2 className="text-xl font-semibold mb-4 text-white">Lab Technicians</h2>
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
              className={`cursor-pointer rounded-md p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                selectedTech?.id === tech.id
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
                      className={`inline-block w-2 h-2 rounded-full ${
                        tech.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'
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
                    width: `${(tech.weeklyProgress.completedTasks / tech.weeklyProgress.totalTasks) * 100}%`,
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
      </nav>
    );
  }
  