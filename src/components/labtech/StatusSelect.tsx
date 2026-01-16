// src/components/labtech/StatusSelect.tsx
import React from 'react';
import type { FormStatus } from '../../types/formtypes';
import { formStatusLabels } from '../../types/formtypes';

interface StatusSelectProps {
  value: FormStatus;
  onChange: (status: FormStatus) => void;
  className?: string;
}

const statuses: FormStatus[] = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'];

export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FormStatus)}
        className={`
          block w-full pl-3 pr-10 py-2.5
          text-sm text-gray-900 dark:text-gray-100
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          appearance-none
          cursor-pointer
          transition-colors duration-200
          hover:border-gray-400 dark:hover:border-gray-500
        `}
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {formStatusLabels[status]}
          </option>
        ))}
      </select>
    </div>
  );
};