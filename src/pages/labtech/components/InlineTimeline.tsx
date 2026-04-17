// components/labtech/InlineTimeline.tsx
import React from 'react';
import { Check } from 'lucide-react';

export interface TimelineHistoryEntry {
  dept: string;
  at: string;
}

interface TimelineProps {
  steps: string[];
  current: string;
  completedSteps?: string[];  // Departments that have been visited/completed
  history?: TimelineHistoryEntry[];  // Full history for per-step timestamps
}

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const InlineTimeline: React.FC<TimelineProps> = ({ steps, current, completedSteps = [], history = [] }) => {
  const normalizeStep = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '_');

  // Build a map of stepKey -> latest timestamp
  const stepTimestamps = new Map<string, string>();
  history.forEach(entry => {
    const key = normalizeStep(entry.dept);
    const existing = stepTimestamps.get(key);
    if (!existing || new Date(entry.at).getTime() > new Date(existing).getTime()) {
      stepTimestamps.set(key, entry.at);
    }
  });

  // Determine step status
  const getStepStatus = (step: string) => {
    const normalizedStep = normalizeStep(step);
    const normalizedCurrent = normalizeStep(current);
    const normalizedCompletedSteps = completedSteps.map(normalizeStep);
    const isCompleted = normalizedCompletedSteps.includes(normalizedStep);
    const isCurrent = normalizedStep === normalizedCurrent;
    const timestamp = stepTimestamps.get(normalizedStep);
    return { isCompleted, isCurrent, timestamp };
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-6">
        {steps.map((step, index) => {
          const { isCompleted, isCurrent, timestamp } = getStepStatus(step);

          // Determine colors
          let circleClass = 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
          let textClass = 'text-gray-600 dark:text-gray-400';

          if (isCompleted && !isCurrent) {
            // Completed department - GREEN
            circleClass = 'bg-green-600 text-white';
            textClass = 'text-green-600 dark:text-green-400';
          } else if (isCurrent) {
            // Current department - BLUE
            circleClass = 'bg-blue-600 text-white';
            textClass = 'text-blue-600 dark:text-blue-400';
          }

          const formattedTime = timestamp ? formatTimestamp(timestamp) : '';

          return (
            <div key={step} className="relative flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${circleClass}`}>
                {isCompleted && !isCurrent ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              <div className="ml-4">
                <div className={`text-sm font-medium transition-colors duration-300 ${textClass}`}>
                  {step}
                </div>
                {isCurrent && (
                  <div className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                    Current Department
                  </div>
                )}
                {isCompleted && !isCurrent && (
                  <div className="mt-1 text-xs text-green-500 dark:text-green-400">
                    Completed
                  </div>
                )}
                {formattedTime && (
                  <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400" title={timestamp}>
                    {formattedTime}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
