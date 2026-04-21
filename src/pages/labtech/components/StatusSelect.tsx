// src/components/labtech/StatusSelect.tsx
import React from 'react';
import type { FormStatus } from '@/types/formtypes';
import { formStatusLabels } from '@/types/formtypes';
import { FloatingSelect } from '@/ui/FloatingSelect';

interface StatusSelectProps {
  value: FormStatus;
  onChange: (status: FormStatus) => void;
  className?: string;
}

const statuses: FormStatus[] = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'];

export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, className = '' }) => {
  return (
    <FloatingSelect
      id="status-select"
      value={value}
      placeholder="Select status"
      options={statuses.map(status => ({ value: status, label: formStatusLabels[status] }))}
      onChange={onChange}
      className={className}
    />
  );
};
