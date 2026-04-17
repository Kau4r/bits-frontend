// src/components/labtech/DeptSelect.tsx
import React from 'react';
import type { FormDepartment, FormDepartmentOption, FormType } from '@/types/formtypes';
import { formDepartmentLabels, getDepartmentsForType } from '@/types/formtypes';

interface DeptSelectProps {
  value: FormDepartment | string;
  onChange: (value: FormDepartment) => void;
  formType?: FormType;
  departments?: FormDepartment[];
  options?: FormDepartmentOption[];
  className?: string;
}

export const DeptSelect: React.FC<DeptSelectProps> = ({ value, onChange, formType, departments, options, className = '' }) => {
  // If formType is specified, only show departments for that type; otherwise show all
  const selectableDepartments: FormDepartment[] = departments ?? (formType
    ? getDepartmentsForType(formType)
    : (['REQUESTOR', 'DEPARTMENT_HEAD', 'DEAN_OFFICE', 'TNS', 'PURCHASING', 'PPFO', 'COMPLETED'] as FormDepartment[]));
  const selectableOptions: FormDepartmentOption[] = options ?? selectableDepartments.map(department => ({ value: department }));

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
        {selectableOptions.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {formDepartmentLabels[option.value]}{option.disabled ? ' (locked)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
