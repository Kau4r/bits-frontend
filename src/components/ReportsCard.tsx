import { useState, useEffect } from 'react';
import { fetchTickets } from '@/services/tickets';

export default function ReportsCard() {
  const [counts, setCounts] = useState({ resolved: 0, inProgress: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const tickets = await fetchTickets();
        setCounts({
          resolved: tickets.filter(t => t.Status === 'RESOLVED').length,
          inProgress: tickets.filter(t => t.Status === 'IN_PROGRESS').length,
          pending: tickets.filter(t => t.Status === 'PENDING').length,
        });
      } catch (err) {
        console.error('Error fetching tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, []);

  const items = [
    { label: 'Resolved', count: counts.resolved, dotColor: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400' },
    { label: 'In Progress', count: counts.inProgress, dotColor: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Pending', count: counts.pending, dotColor: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-5 w-6 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(({ label, count, dotColor, textColor }) => (
        <div key={label} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
            <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
          </div>
          <span className={`text-lg font-bold ${textColor}`}>{count}</span>
        </div>
      ))}
    </div>
  );
}
