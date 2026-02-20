import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 h-full flex flex-col min-h-0 ${className}`}>
      {title && (
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <div className="mt-3 h-px bg-gray-100 dark:bg-gray-700/50" />
        </div>
      )}
      <div className="px-4 pb-4 pt-1 flex-1 min-h-0 overflow-auto">
        {children}
      </div>
    </div>
  );
}
