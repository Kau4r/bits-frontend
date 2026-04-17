import React, { useMemo, useState, useEffect } from 'react';
import type { FormStatus, FormType, FormRecord, FormDepartment } from '@/types/formtypes';
import { formDepartmentLabels, getDepartmentsForType } from '@/types/formtypes';

export const AddFormDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (record: Omit<FormRecord, 'id' | 'createdAt'> & { files: File[] }) => Promise<void> | void;
  existing?: FormRecord[];
}> = ({ open, onClose, onCreate, existing = [] }) => {
  const [type, setType] = useState<FormType>('WRF');
  const [department, setDepartment] = useState<FormDepartment>('REQUESTOR');
  const [status, setStatus] = useState<FormStatus>('PENDING');
  const [requesterName, setRequesterName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Get departments for the selected form type
  const departments = useMemo(() => getDepartmentsForType(type), [type]);

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      setType('WRF');
      setDepartment('REQUESTOR');
      setStatus('PENDING');
      setRequesterName('');
      setRemarks('');
      setFiles([]);
      setIsSubmitting(false);
      setSubmitError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  // Reset department when form type changes
  useEffect(() => {
    setDepartment('REQUESTOR');
  }, [type]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (files.length === 0) {
      setSubmitError('Please attach at least one file before tracking the form.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate({
        formId: nextId,
        type,
        status,
        department,
        files,
        isArchived: false,
        requesterName: requesterName || undefined,
        remarks: remarks || undefined,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create form. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
    setSubmitError(null);
  };

  const clearFile = (e: React.MouseEvent, indexToRemove?: number) => {
    e.stopPropagation();
    setFiles(prev => typeof indexToRemove === 'number' ? prev.filter((_, index) => index !== indexToRemove) : []);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Form</h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                disabled={isSubmitting}
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
                onChange={(e) => setDepartment(e.target.value as FormDepartment)}
                disabled={isSubmitting}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {formDepartmentLabels[dept]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FormStatus)}
                disabled={isSubmitting}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
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

          {/* Requester Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Requester Name
            </label>
            <input
              type="text"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Name of the person requesting"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remarks / Notes
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isSubmitting}
              placeholder="Any additional notes or context..."
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attach File <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex flex-col items-center justify-center px-4 py-6 bg-white dark:bg-gray-800 text-blue-600 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
                  {files.length > 0 ? `${files.length} file(s) selected` : 'Click to select files'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  multiple
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="hidden"
                  required
                />
              </label>
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={isSubmitting}
                  className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((selectedFile, index) => (
                  <div key={`${selectedFile.name}-${selectedFile.size}-${index}`} className="flex items-center justify-between rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <span className="truncate">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={(event) => clearFile(event, index)}
                      disabled={isSubmitting}
                      className="ml-3 text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length === 0 && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Please select at least one file
              </p>
            )}
          </div>

          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={files.length === 0 || isSubmitting}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${files.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed'
                : 'bg-blue-400 cursor-not-allowed'
                }`}
            >
              {isSubmitting ? 'Tracking...' : 'Track Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
