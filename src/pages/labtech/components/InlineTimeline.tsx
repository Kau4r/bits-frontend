// components/labtech/InlineTimeline.tsx
import React from 'react';
import { Check } from 'lucide-react';

interface TimelineProps {
  steps: string[];
  current: string;
  completedSteps?: string[];  // Departments that have been visited/completed
}

export const InlineTimeline: React.FC<TimelineProps> = ({ steps, current, completedSteps = [] }) => {
  // Determine step status
  const getStepStatus = (step: string) => {
    const isCompleted = completedSteps.includes(step.toUpperCase()) || completedSteps.includes(step);
    const isCurrent = step.toUpperCase() === current.toUpperCase() || step === current;
    return { isCompleted, isCurrent };
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-6">
        {steps.map((step, index) => {
          const { isCompleted, isCurrent } = getStepStatus(step);

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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};