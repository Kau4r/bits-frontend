// src/components/labtech/DeptSelect.tsx
import React from 'react';
import type { FormDepartment, FormType } from '../../types/formtypes';
import { formDepartmentLabels, getDepartmentsForType } from '../../types/formtypes';

interface DeptSelectProps {
  value: FormDepartment | string;
  onChange: (value: FormDepartment) => void;
  formType?: FormType;
  className?: string;
}

export const DeptSelect: React.FC<DeptSelectProps> = ({ value, onChange, formType, className = '' }) => {
  // If formType is specified, only show departments for that type; otherwise show all
  const departments: FormDepartment[] = formType
    ? getDepartmentsForType(formType)
    : (['REQUESTOR', 'DEPARTMENT_HEAD', 'DEAN_OFFICE', 'TNS', 'PURCHASING', 'PPFO', 'COMPLETED'] as FormDepartment[]);

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FormDepartment)}
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
            {formDepartmentLabels[dept]}
          </option>
        ))}
      </select>
    </div>
  );
};