import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import TableSearchInput from '../../components/Search';
import { AddFormDialog } from '../../components/labtech/AddFormDialog';
import { RowPreview } from '../../components/labtech/RowPreview';
import { InlineTimeline } from '../../components/labtech/InlineTimeline';
import { StatusSelect } from '../../components/labtech/StatusSelect';
import { DeptSelect } from '../../components/labtech/DeptSelect';
import type { FormRecord, FormStatus, FormType, FormDepartment } from '../../types/formtypes';
import { formStatusColors, formStatusLabels, formDepartmentLabels } from '../../types/formtypes';
import { getForms, createForm, updateForm as updateFormAPI, archiveForm as archiveFormAPI, transferForm } from '../../services/forms';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { useNotifications } from '@/context/NotificationContext';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Form } from '../../types/formtypes';

// Use the imported formStatusColors for status chips
const statusChip = formStatusColors;

// Department display names (for UI) with matching to backend uppercase values
const steps = ['Registrar', 'Finance', 'DCISM', 'Laboratory'] as const;

export default function Forms() {
  const { user } = useAuth();
  const modal = useModal();
  const { notifications } = useNotifications(); // Listen for real-time updates
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formTypeFilter, setFormTypeFilter] = useState<FormType | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<FormStatus | 'All'>('All');
  const [loading, setLoading] = useState(true);

  // Local state for buffered edits: formId -> partial updates
  const [editedForms, setEditedForms] = useState<Record<string, Partial<FormRecord>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Helper to map API Form to local FormRecord
  const mapFormToRecord = useCallback((form: Form): FormRecord => ({
    id: form.Form_ID.toString(),
    formId: form.Form_Code,
    type: form.Form_Type,
    status: form.Status,
    department: form.Department,
    createdAt: form.Created_At,
    isArchived: form.Is_Archived,
    attachmentName: form.File_Name || undefined,
    attachmentUrl: form.File_URL || undefined,
    attachmentType: normalizeType(form.File_Name || undefined),
    history: form.History?.map(h => ({
      dept: h.Department,
      at: h.Changed_At
    })) || []
  }), []);

  const loadForms = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await getForms();
      setForms(data.map(mapFormToRecord));
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [mapFormToRecord]);

  // Load forms on mount
  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Track processed notifications to prevent duplicate refreshes
  const lastNotificationIdRef = useRef<number | null>(null);

  // Real-time updates: listen for form-related notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];

      // Skip if we already processed this notification
      if (lastNotificationIdRef.current === latest.id) return;

      const isFormRelated =
        latest.title.toLowerCase().includes('form') ||
        latest.message.toLowerCase().includes('form') ||
        // Fallback for generic updates if title is missing "Form" but context implies it
        (latest.type === 'info' && latest.message.includes('Status updated'));

      if (isFormRelated) {
        console.log('[Forms] Real-time update detected:', latest.title, latest.id);
        lastNotificationIdRef.current = latest.id;
        loadForms(true); // Silent refresh
      }
    }
  }, [notifications, loadForms]);


  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return forms
      .filter(f => (showArchived ? f.isArchived : !f.isArchived))
      .filter(f => {
        const matchesSearch = `${f.formId} ${f.type} ${f.status} ${f.department} ${f.attachmentName || ''}`
          .toLowerCase()
          .includes(q);
        const matchesFormType = formTypeFilter === 'All' || f.type === formTypeFilter;
        const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
        return matchesSearch && matchesFormType && matchesStatus;
      });
  }, [forms, searchTerm, showArchived, formTypeFilter, statusFilter]);

  const normalizeType = (name?: string): 'pdf' | 'image' | 'doc' | 'docx' | undefined => {
    if (!name) return undefined;
    if (/\.(pdf)$/i.test(name)) return 'pdf';
    if (/\.(png|jpe?g|webp|gif|heic)$/i.test(name)) return 'image';
    if (/\.(docx?|rtf)$/i.test(name)) return name.toLowerCase().endsWith('docx') ? 'docx' : 'doc';
    return undefined;
  };

  const handleCreateForm = async (payload: Omit<FormRecord, 'id' | 'createdAt' | 'isArchived'> & { file?: File }) => {
    if (!user?.User_ID) {
      console.error('User not authenticated');
      return;
    }

    try {
      const createdForm = await createForm({
        creatorId: user.User_ID,
        formType: payload.type,
        title: payload.formId,
        content: payload.department,
        fileName: payload.file?.name,
        fileUrl: undefined, // TODO: Implement file upload
        fileType: payload.file?.type,
        department: payload.department as any
      });

      setForms(prev => {
        // Prevent duplicate Key error if WebSocket already refreshed the list
        if (prev.some(f => f.id === createdForm.Form_ID.toString())) {
          return prev;
        }
        return [mapFormToRecord(createdForm), ...prev];
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create form:', error);
      await modal.showError('Failed to create form. Please try again.', 'Error');
    }
  };

  // Local state update only
  const handleLocalChange = (id: string, field: keyof FormRecord, value: any) => {
    setEditedForms(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  // Commit changes to backend
  const handleSave = async (id: string) => {
    const edits = editedForms[id];
    if (!edits) return;

    setSavingIds(prev => new Set(prev).add(id));

    try {
      // 1. Handle Status Update
      if (edits.status) {
        await updateFormAPI(parseInt(id), {
          status: edits.status as any,
          // title is required by API usually, preserve existing if not changed
          title: forms.find(f => f.id === id)?.formId || ''
        });
      }

      // 2. Handle Department Transfer
      if (edits.department) {
        await transferForm(parseInt(id), edits.department as any, `Transferred to ${edits.department}`);
      }

      // Success: Apply changes locally and clear edit state
      setForms(prev => prev.map(f => {
        if (f.id !== id) return f;
        let updated = { ...f, ...edits };

        // If dept changed, append history locally for immediate feedback
        if (edits.department) {
          const history = [...(f.history || []), { dept: edits.department, at: new Date().toISOString() }];
          updated = { ...updated, history };
        }
        return updated;
      }));

      setEditedForms(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

    } catch (error) {
      console.error('Failed to save form:', error);
      await modal.showError('Failed to save changes. Please try again.', 'Error');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCancel = (id: string) => {
    setEditedForms(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };


  const archiveForm = async (f: FormRecord) => {
    const ok = await modal.showConfirm('Are you sure you want to archive this form?', 'Archive Form');
    if (!ok) return;

    try {
      await archiveFormAPI(parseInt(f.id));
      setForms(prev =>
        prev.map(form =>
          form.id === f.id ? { ...form, isArchived: true, status: 'Archived' as FormStatus } : form
        )
      );
      setExpandedRow(null);
    } catch (error) {
      console.error('Failed to archive form:', error);
      await modal.showError('Failed to archive form. Please try again.', 'Error');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Header section */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Forms</h1>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <TableSearchInput
            searchTerm={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Filename"
            showLabel={false}
          />

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${showArchived
              ? 'bg-blue-700 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>

          <div className="relative">
            <select
              value={formTypeFilter}
              onChange={(e) => setFormTypeFilter(e.target.value as FormType | 'All')}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {(['All', 'WRF', 'RIS'] as const).map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FormStatus | 'All')}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              {(['PENDING', 'APPROVED', 'REJECTED', 'IN_REVIEW', 'ARCHIVED'] as FormStatus[]).map((status) => (
                <option key={status} value={status}>
                  {formStatusLabels[status]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ml-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Form
          </button>
        </div>
      </div>

      {/* Table section */}
      <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex-1 flex flex-col">

          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <div className="col-span-4">File</div>
            <div className="col-span-2">Form</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-32 text-gray-500">
                Loading forms...
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(f => (
                  <li
                    key={f.id}
                    className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className="grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                    >
                      <div className="col-span-4 flex items-center">
                        <div className="flex items-center gap-3 min-w-0 w-full">
                          <RowPreview url={f.attachmentUrl} name={f.attachmentName} type={f.attachmentType} />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                            {f.attachmentName || 'No file'}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{f.formId}</span>
                      </div>

                      <div className="col-span-2 flex items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusChip[f.status as FormStatus] || statusChip.ARCHIVED
                          }`}>
                          {formStatusLabels[f.status as FormStatus] || f.status}
                        </span>
                      </div>

                      <div className="col-span-2 flex items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{formDepartmentLabels[f.department as FormDepartment] || f.department}</span>
                      </div>

                      <div className="col-span-2 flex items-center justify-end">
                        <button
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRow(expandedRow === f.id ? null : f.id);
                          }}
                          aria-label={expandedRow === f.id ? 'Collapse' : 'Expand'}
                        >
                          {expandedRow === f.id ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {expandedRow === f.id && (
                      <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-5 flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Processing Timeline
                              </h4>
                              <div className="p-2">
                                <InlineTimeline
                                  steps={steps as unknown as string[]}
                                  current={formDepartmentLabels[f.department as FormDepartment] || f.department}
                                  completedSteps={f.history?.map(h => h.dept) || []}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="lg:col-span-2 space-y-5">
                            {/* Save Actions Logic */}
                            {editedForms[f.id] && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between animate-fadeIn">
                                <div className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                  You have unsaved changes ({Object.keys(editedForms[f.id]!).length})
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSave(f.id)}
                                    disabled={savingIds.has(f.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded shadow transition-colors disabled:opacity-50"
                                  >
                                    {savingIds.has(f.id) ? (
                                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <CheckIcon className="w-4 h-4" />
                                    )}
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={() => handleCancel(f.id)}
                                    disabled={savingIds.has(f.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded shadow transition-colors"
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Update Status
                              </h4>
                              <div className="w-full">
                                <StatusSelect
                                  value={editedForms[f.id]?.status ?? f.status}
                                  onChange={(s) => handleLocalChange(f.id, 'status', s)}
                                  className="w-full"
                                />
                              </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Transfer Department
                              </h4>
                              <div className="w-full">
                                <DeptSelect
                                  value={editedForms[f.id]?.department ?? f.department}
                                  onChange={(d) => handleLocalChange(f.id, 'department', d)}
                                  className="w-full"
                                />
                              </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" />
                                </svg>
                                File Actions
                              </h4>
                              <div className="flex flex-wrap gap-3">
                                {f.attachmentUrl ? (
                                  <>
                                    <a
                                      href={f.attachmentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      Preview
                                    </a>
                                    <a
                                      href={f.attachmentUrl}
                                      download={f.attachmentName || f.formId}
                                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Download
                                    </a>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        archiveForm(f);
                                      }}
                                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                      </svg>
                                      Archive
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-500 dark:text-gray-400">No file attached</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-4 py-6 text-sm text-center text-gray-500 bg-white dark:bg-gray-900 dark:text-gray-400">
                    No forms found. {!showArchived && (
                      <button
                        onClick={() => setShowArchived(true)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Check archived forms
                      </button>
                    )}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AddFormDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onCreate={handleCreateForm}
        existing={forms}
      />
    </div>
  );
}