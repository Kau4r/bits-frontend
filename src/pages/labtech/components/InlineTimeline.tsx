// components/labtech/InlineTimeline.tsx
import React from 'react';
import { Check } from 'lucide-react';
import type { FormHistoryAction } from '@/types/formtypes';
import { formHistoryActionLabels } from '@/types/formtypes';

export interface TimelineHistoryEntry {
  dept: string;
  at: string;
  action?: FormHistoryAction;
  performedByName?: string | null;
  reason?: string | null;
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

  // Build a map of stepKey -> latest history entry (full entry, so action/performer/reason are available)
  const stepEntries = new Map<string, TimelineHistoryEntry>();
  history.forEach(entry => {
    const key = normalizeStep(entry.dept);
    const existing = stepEntries.get(key);
    if (!existing || new Date(entry.at).getTime() > new Date(existing.at).getTime()) {
      stepEntries.set(key, entry);
    }
  });

  // Determine step status
  const getStepStatus = (step: string) => {
    const normalizedStep = normalizeStep(step);
    const normalizedCurrent = normalizeStep(current);
    const normalizedCompletedSteps = completedSteps.map(normalizeStep);
    const isCompleted = normalizedCompletedSteps.includes(normalizedStep);
    const isCurrent = normalizedStep === normalizedCurrent;
    const entry = stepEntries.get(normalizedStep);
    return { isCompleted, isCurrent, entry };
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-6">
        {steps.map((step, index) => {
          const { isCompleted, isCurrent, entry } = getStepStatus(step);

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

          const formattedTime = entry ? formatTimestamp(entry.at) : '';
          const actionLabel = entry?.action ? formHistoryActionLabels[entry.action] : undefined;
          const performerName = entry?.performedByName;

          // Accountability sub-line: prefer action-led text when we have an action,
          // otherwise show plain "by <name>" when a performer is available.
          let accountabilityLine: string | undefined;
          if (actionLabel && performerName) {
            accountabilityLine = `${actionLabel} by ${performerName}`;
          } else if (actionLabel) {
            accountabilityLine = actionLabel;
          } else if (performerName) {
            accountabilityLine = `by ${performerName}`;
          }

          const showReason = entry?.action === 'RETURNED' && entry.reason;

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
                    Current Step
                  </div>
                )}
                {isCompleted && !isCurrent && (
                  <div className="mt-1 text-xs text-green-500 dark:text-green-400">
                    Completed
                  </div>
                )}
                {formattedTime && (
                  <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400" title={entry?.at}>
                    {formattedTime}
                  </div>
                )}
                {accountabilityLine && (
                  <div className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-300">
                    {accountabilityLine}
                  </div>
                )}
                {showReason && (
                  <div className="mt-0.5 text-[11px] italic text-gray-500 dark:text-gray-400">
                    Reason: {entry!.reason}
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
