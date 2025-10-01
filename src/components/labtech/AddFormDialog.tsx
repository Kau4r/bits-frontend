import React, { useMemo, useState, useEffect } from 'react';
import type { FormStatus, FormType, FormRecord } from '@/types/formtypes';

export const AddFormDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (record: Omit<FormRecord, 'id' | 'createdAt' > & { file?: File }) => void;
  existing?: FormRecord[];
}> = ({ open, onClose, onCreate, existing = [] }) => {
  const [type, setType] = useState<FormType>('WRF');
  const [department, setDepartment] = useState('Registrar');
  const [status, setStatus] = useState<FormStatus>('Pending');
  const [file, setFile] = useState<File | undefined>();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      setType('WRF');
      setDepartment('Registrar');
      setStatus('Pending');
      setFile(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  const nextId = useMemo(() => {
    const prefix = type;
    const max = existing
      .filter(r => r.type === type)
      .map(r => Number(r.formId.split('-')[1]))
      .filter(n => !Number.isNaN(n))
      .reduce((a, b) => Math.max(a, b), 0);
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }, [existing, type]);

  const accept = ".pdf,.doc,.docx,image/*";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    onCreate({
      formId: nextId,
      type,
      status,
      department,
      file,
      isArchived: false
    });
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0]);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Form</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Form Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FormType)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm"
              >
                <option value="WRF">WRF</option>
                <option value="RIS">RIS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm"
              >
                <option value="Registrar">Registrar</option>
                <option value="Finance">Finance</option>
                <option value="DCISM">DCISM</option>
                <option value="Laboratory">Laboratory</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FormStatus)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="In Review">In Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Form ID
              </label>
              <input
                type="text"
                value={nextId}
                readOnly
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white p-2 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attach File <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex flex-col items-center justify-center px-4 py-6 bg-white dark:bg-gray-800 text-blue-600 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <svg
                  className="w-8 h-8 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {file ? file.name : 'Click to select a file'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
              </label>
              {file && (
                <button
                  type="button"
                  onClick={clearFile}
                  className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            {!file && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Please select a file
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                file 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-blue-400 cursor-not-allowed'
              }`}
            >
              Create Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};