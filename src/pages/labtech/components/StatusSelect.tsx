// src/components/labtech/StatusSelect.tsx
import React from 'react';
import type { FormStatus } from '@/types/formtypes';
import { formStatusLabels } from '@/types/formtypes';
import { FloatingSelect } from '@/ui/FloatingSelect';

interface StatusSelectProps {
  value: FormStatus;
  onChange: (status: FormStatus) => void;
  className?: string;
  disabledStatuses?: FormStatus[];
}

const statuses: FormStatus[] = ['PENDING', 'IN_REVIEW', 'APPROVED', 'CANCELLED'];

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  className = '',
  disabledStatuses = [],
}) => {
  return (
    <FloatingSelect
      id="status-select"
      value={value}
      placeholder="Select status"
      options={statuses.map(status => ({
        value: status,
        label: formStatusLabels[status],
        disabled: disabledStatuses.includes(status),
      }))}
      onChange={onChange}
      className={className}
    />
  );
};
