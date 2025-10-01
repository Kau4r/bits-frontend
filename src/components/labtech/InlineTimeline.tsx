// components/labtech/InlineTimeline.tsx
import React from 'react';

interface TimelineProps {
  steps: string[];
  current: string;
}

export const InlineTimeline: React.FC<TimelineProps> = ({ steps, current }) => {
  const currentIndex = steps.indexOf(current);
  
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = step === current;
          
          return (
            <div key={step} className="relative flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
              }`}>
                {index + 1}
              </div>
              
              <div className="ml-4">
                <div className={`text-sm font-medium ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step}
                </div>
                {isCurrent && (
                  <div className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                    Current Department
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