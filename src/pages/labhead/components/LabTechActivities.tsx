type Activity = {
    title: string;
    details: string;
    date: string;
  };
  
  interface Activities {
    completed: Activity[];
    pending: Activity[];
    inProgress: Activity[];
  }
  
  interface Props {
    activities: Activities;
  }
  
  
  export default function LabTechActivities({ activities }: Props) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActivityCard title="Completed" color="green" items={activities.completed} />
        <ActivityCard title="Pending" color="yellow" items={activities.pending} />
        <ActivityCard title="In Progress" color="blue" items={activities.inProgress} />
      </div>
    );
  }
  
  function ActivityCard({ title, color, items }: { title: string; color: string; items: Activity[] }) {
    const borderColors: Record<string, string> = {
      green: 'border-green-300 dark:border-green-700',
      yellow: 'border-yellow-300 dark:border-yellow-700',
      blue: 'border-blue-300 dark:border-blue-700',
    };

    const bgColors: Record<string, string> = {
      green: 'bg-green-50 dark:bg-green-900',
      yellow: 'bg-yellow-50 dark:bg-yellow-900',
      blue: 'bg-blue-50 dark:bg-blue-900',
    };

    return (
      <section className={`p-4 rounded-md border-l-4 ${borderColors[color]} ${bgColors[color]} space-y-4`}>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {title} ({items.length})
        </h3>
        {items.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">No {title.toLowerCase()} activities</p>
        ) : (
          items.map(({ title, details, date }) => (
            <div key={title}>
              <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{details}</p>
              <p className="text-xs text-gray-500">{date}</p>
            </div>
          ))
        )}
      </section>
    );
  }
  