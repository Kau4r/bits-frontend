import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, FC, FormEvent, MouseEvent } from 'react';
import type { FormStatus, FormType, FormRecord, FormDepartment } from '@/types/formtypes';
import { formTypeLabels } from '@/types/formtypes';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export const AddFormDialog: FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (record: Omit<FormRecord, 'id' | 'createdAt'> & { files: File[] }) => Promise<void> | void;
  existing?: FormRecord[];
}> = ({ open, onClose, onCreate }) => {
  const [type, setType] = useState<FormType>('WRF');
  const [title, setTitle] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [department, setDepartment] = useState<FormDepartment>('REQUESTOR');
  const [status, setStatus] = useState<FormStatus>('PENDING');
  const [requesterName, setRequesterName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(dialogRef, open);

  const formNumberPrefix = type === 'WRF' ? 'WRF' : 'RIS';

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      setType('WRF');
      setTitle('');
      setFormNumber('');
      setDepartment('REQUESTOR');
      setStatus('PENDING');
      setRequesterName('');
      setRemarks('');
      setFiles([]);
      setIsSubmitting(false);
      setSubmitError(null);
      setFileError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  // Reset department when form type changes
  useEffect(() => {
    setDepartment('REQUESTOR');
  }, [type]);

  const accept = ".pdf,.doc,.docx,image/*";

  const earlyStages: FormDepartment[] = ['REQUESTOR', 'DEPARTMENT_HEAD', 'DEAN_OFFICE'];
  const attachmentRequired = !earlyStages.includes(department);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (attachmentRequired && files.length === 0) {
      setFileError('Please attach at least one file before tracking the form.');
      return;
    }

    if (!title.trim()) {
      setSubmitError('Please enter a title before tracking the form.');
      return;
    }

    if (!formNumber.trim()) {
      setSubmitError('Please enter a form number before tracking the form.');
      return;
    }

    if (!requesterName.trim()) {
      setSubmitError('Please enter the requester name before tracking the form.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formNumberValue = formNumber.trim();
      const formNumberWithoutPrefix = formNumberValue.replace(/^(RIS|WRF)[-\s]*/i, '');

      await onCreate({
        formNumber: formNumberWithoutPrefix ? `${formNumberPrefix}-${formNumberWithoutPrefix}` : '',
        title: title.trim(),
        type,
        status,
        department,
        files,
        isArchived: false,
        requesterName: requesterName.trim(),
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
    setSubmitError(null);
    setFileError(null);
  };

  const clearFile = (e: MouseEvent, indexToRemove?: number) => {
    e.stopPropagation();
    setFiles(prev => typeof indexToRemove === 'number' ? prev.filter((_, index) => index !== indexToRemove) : []);
    setFileError(null);
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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden" noValidate>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSubmitError(null);
                  }}
                  disabled={isSubmitting}
                  placeholder="Enter form title"
                  className="w-full rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white p-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Form Number <span className="text-red-500">*</span>
                </label>
                <div className="flex overflow-hidden rounded-md border border-gray-300 bg-white dark:border-[#334155] dark:bg-[#1e2939]">
                  <span className="inline-flex shrink-0 items-center border-r border-gray-300 bg-gray-50 px-3 text-sm font-medium text-gray-700 dark:border-[#334155] dark:bg-gray-800 dark:text-gray-300">
                    {formNumberPrefix}
                  </span>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => {
                      setFormNumber(e.target.value);
                      setSubmitError(null);
                    }}
                    disabled={isSubmitting}
                    placeholder="Enter form number"
                    className="min-w-0 flex-1 bg-transparent p-2 text-sm text-gray-900 outline-none dark:text-white"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Form Type
                </label>
                <FloatingSelect
                  id="add-form-type"
                  value={type}
                  onChange={(value) => setType(value as FormType)}
                  disabled={isSubmitting}
                  placeholder="Select form type"
                  options={[
                    { value: 'WRF', label: 'WRF' },
                    { value: 'RIS_E', label: formTypeLabels.RIS_E },
                    { value: 'RIS_NE', label: formTypeLabels.RIS_NE },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <FloatingSelect
                  id="add-form-status"
                  value={status}
                  onChange={(value) => setStatus(value as FormStatus)}
                  disabled={isSubmitting}
                  placeholder="Select status"
                  options={[
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'IN_REVIEW', label: 'In Review' },
                    { value: 'APPROVED', label: 'Approved' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                />
              </div>

          
            </div>

          {/* Requester Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Requester Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={requesterName}
              onChange={(e) => {
                setRequesterName(e.target.value);
                setSubmitError(null);
              }}
              disabled={isSubmitting}
              placeholder="Name of the person requesting"
              className="w-full rounded-md border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white p-2 text-sm"
              required
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
              className="w-full rounded-md border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white p-2 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attach File {attachmentRequired && <span className="text-red-500">*</span>}
              {!attachmentRequired && <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(optional)</span>}
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
            {fileError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fileError}
              </p>
            )}
          </div>

          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {submitError}
            </div>
          )}

          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
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
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Tracking...' : 'Track Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
