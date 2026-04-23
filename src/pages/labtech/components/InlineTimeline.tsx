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
  compact?: boolean;
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

export const InlineTimeline: React.FC<TimelineProps> = ({ steps, current, completedSteps = [], history = [], compact = false }) => {
  const normalizeStep = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '_');
  const lineLeftClass = compact ? 'left-4' : 'left-4';
  const itemGapClass = compact ? 'space-y-5' : 'space-y-6';
  const circleClassBase = compact
    ? 'h-8 w-8 text-sm'
    : 'h-8 w-8';
  const checkClass = compact ? 'h-4 w-4' : 'w-4 h-4';
  const labelClass = compact ? 'text-base' : 'text-sm';

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
    <div className="relative isolate overflow-hidden">
      <div className={itemGapClass}>
        {steps.map((step, index) => {
          const { isCompleted, isCurrent, entry } = getStepStatus(step);
          const isTerminalCurrent = isCurrent && normalizeStep(step) === 'COMPLETED';

          // Determine colors
          let circleClass = 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
          let textClass = 'text-gray-600 dark:text-gray-400';

          if ((isCompleted && !isCurrent) || isTerminalCurrent) {
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
              {index < steps.length - 1 && (
                <div className={`absolute ${lineLeftClass} top-8 bottom-[-1.25rem] w-0.5 bg-gray-200 dark:bg-gray-700`} />
              )}
              <div className={`relative z-[1] flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${circleClassBase} ${circleClass}`}>
                {(isCompleted && !isCurrent) || isTerminalCurrent ? (
                  <Check className={checkClass} />
                ) : (
                  index + 1
                )}
              </div>

              <div className={compact ? 'ml-4' : 'ml-4'}>
                <div className={`${labelClass} font-medium transition-colors duration-300 ${textClass}`}>
                  {step}
                </div>
                {isCurrent && !isTerminalCurrent && (
                  <div className={`${compact ? 'text-sm' : 'text-xs'} mt-1 text-blue-500 dark:text-blue-400`}>
                    Current Step
                  </div>
                )}
                {((isCompleted && !isCurrent) || isTerminalCurrent) && (
                  <div className={`${compact ? 'text-sm' : 'text-xs'} mt-1 text-green-500 dark:text-green-400`}>
                    Completed
                  </div>
                )}
                {formattedTime && (
                  <div className={`${compact ? 'text-xs' : 'text-[11px]'} mt-0.5 text-gray-500 dark:text-gray-400`} title={entry?.at}>
                    {formattedTime}
                  </div>
                )}
                {accountabilityLine && (
                  <div className={`${compact ? 'text-xs' : 'text-[11px]'} mt-0.5 text-gray-600 dark:text-gray-300`}>
                    {accountabilityLine}
                  </div>
                )}
                {showReason && (
                  <div className={`${compact ? 'text-xs' : 'text-[11px]'} mt-0.5 italic text-gray-500 dark:text-gray-400`}>
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
