// src/components/labtech/DeptSelect.tsx
import React from 'react';
import type { FormDepartment, FormDepartmentOption, FormType } from '@/types/formtypes';
import { formDepartmentLabels, getDepartmentsForType } from '@/types/formtypes';
import { FloatingSelect } from '@/ui/FloatingSelect';

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
    <FloatingSelect
      id="department-select"
      value={value as FormDepartment | ''}
      placeholder="Select department"
      options={selectableOptions.map(option => ({
        value: option.value,
        label: `${formDepartmentLabels[option.value]}${option.disabled ? ' (locked)' : ''}`,
        disabled: option.disabled,
      }))}
      onChange={onChange}
      className={className}
    />
  );
};
