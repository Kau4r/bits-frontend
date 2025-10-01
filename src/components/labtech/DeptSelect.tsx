// src/components/labtech/DeptSelect.tsx
import React from 'react';

interface DeptSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const departments = ['Registrar', 'Finance', 'DCISM', 'Laboratory'];

export const DeptSelect: React.FC<DeptSelectProps> = ({ value, onChange, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        {departments.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
    </div>
  );
};