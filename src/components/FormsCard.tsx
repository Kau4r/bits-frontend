import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Eye } from 'lucide-react';

interface FormsCardProps {
  pendingCount?: number;
  approvedCount?: number;
  inReviewCount?: number;
}

export default function FormsCard({ pendingCount = 0, approvedCount = 0, inReviewCount = 0 }: FormsCardProps) {
  const [counts, setCounts] = useState({ approved: 0, pending: 0, inReview: 0 });

  useEffect(() => {
    setCounts({ approved: approvedCount, pending: pendingCount, inReview: inReviewCount });
  }, [pendingCount, approvedCount, inReviewCount]);

  const items = [
    { label: 'Approved', count: counts.approved, icon: CheckCircle, dotColor: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400' },
    { label: 'Pending', count: counts.pending, icon: Clock, dotColor: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'In Review', count: counts.inReview, icon: Eye, dotColor: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
  ];

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
