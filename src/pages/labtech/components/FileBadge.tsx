import React from 'react';

export const FileBadge: React.FC<{ name?: string; type?: 'pdf' | 'image' | 'doc' | 'docx' }> = ({ name, type }) => {
  const color =
    type === 'pdf' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
    type === 'image' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';

  const label = type === 'pdf' ? 'PDF' : type === 'image' ? 'Image' : 'Doc';
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${color}`} title={name}>
      {label}
    </span>
  );
};
