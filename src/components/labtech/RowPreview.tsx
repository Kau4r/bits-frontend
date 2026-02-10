import React from 'react';
import { FileBadge } from './FileBadge';

export const RowPreview: React.FC<{ 
  url?: string; 
  name?: string; 
  type?: 'pdf' | 'image' | 'doc' | 'docx'  
}> = ({ url, name, type }) => {
  if (!url) {
    return (
      <div className="w-16 h-16 grid place-items-center rounded border border-dashed border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-500">
        No file
      </div>
    );
  }
  if (type === 'image') {
    return (
      <div className="w-16 h-16 rounded overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <img src={url} alt={name || 'image'} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="w-16 h-16 grid place-items-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <FileBadge name={name} type={type} />
    </div>
  );
};