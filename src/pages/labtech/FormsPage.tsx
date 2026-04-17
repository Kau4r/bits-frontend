import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Table from '@/components/Table';
import Search from '@/components/Search';
import { AddFormDialog } from '@/pages/labtech/components/AddFormDialog';
import { RowPreview } from '@/pages/labtech/components/RowPreview';
import { InlineTimeline } from '@/pages/labtech/components/InlineTimeline';
import { StatusSelect } from '@/pages/labtech/components/StatusSelect';
import { DeptSelect } from '@/pages/labtech/components/DeptSelect';
import type { FormRecord, FormStatus, FormType, FormDepartment } from '@/types/formtypes';
import { formStatusColors, formStatusLabels, formDepartmentLabels, getTimelineStepsForType, getAvailableTransferDepartments } from '@/types/formtypes';
import { getForms, createForm, updateForm as updateFormAPI, archiveForm as archiveFormAPI, transferForm, uploadFile, resolveFormFileUrl } from '@/services/forms';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useNotifications } from '@/context/NotificationContext';
import { Check, X, Plus, Filter, Archive, Inbox, RefreshCw } from 'lucide-react';
import type { Form } from '@/types/formtypes';

// Use the imported formStatusColors for status chips
const statusChip = formStatusColors;

// Department display names (for UI) with matching to backend uppercase values
// Timeline steps are now derived per form type via getTimelineStepsForType()

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

  const tableHeaders = [
    { label: 'File', key: 'attachmentName' },
    { label: 'Form ID', key: 'formId' },
    { label: 'Status', key: 'status' },
    { label: 'Department', key: 'department' },
    { label: 'Actions', align: 'right' as const }
  ];

  // Local state for buffered edits: formId -> partial updates
  const [editedForms, setEditedForms] = useState<Record<string, Partial<FormRecord>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [replacingFileIds, setReplacingFileIds] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
    attachmentUrl: resolveFormFileUrl(form.File_URL),
    attachmentType: normalizeType(form.File_Name || undefined),
    history: form.History?.map(h => ({
      dept: h.Department,
      at: h.Changed_At
    })) || [],
    requesterName: form.Requester_Name || undefined,
    remarks: form.Remarks || undefined,
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

  const hasActiveFilters = searchTerm !== '' || formTypeFilter !== 'All' || statusFilter !== 'All';

  const getFormDownloadUrl = (form: FormRecord) =>
    resolveFormFileUrl(form.attachmentUrl, {
      download: true,
      fileName: form.attachmentName || form.formId,
    }) || form.attachmentUrl;

  const fetchAttachmentBlob = async (url?: string) => {
    if (!url) throw new Error('No file is attached to this form.');

    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      throw new Error('The attached file is missing from the server. Please replace the file.');
    }

    if (contentType.includes('text/html')) {
      throw new Error('The file link points to the website page instead of an uploaded file. Please replace the file.');
    }

    return response.blob();
  };

  const handlePreviewFile = async (form: FormRecord) => {
    const previewWindow = window.open('', '_blank');

    if (!previewWindow) {
      await modal.showError('Your browser blocked the preview popup. Please allow popups and try again.', 'Preview Blocked');
      return;
    }

    previewWindow.document.title = form.attachmentName || `${form.formId} preview`;
    previewWindow.document.body.innerHTML = '<p style="font-family: sans-serif; padding: 24px;">Loading preview...</p>';

    try {
      const blob = await fetchAttachmentBlob(form.attachmentUrl);
      const objectUrl = URL.createObjectURL(blob);
      previewWindow.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      previewWindow.close();
      await modal.showError(error instanceof Error ? error.message : 'Unable to preview this file.', 'Preview Failed');
    }
  };

  const handleDownloadFile = async (form: FormRecord) => {
    try {
      const blob = await fetchAttachmentBlob(getFormDownloadUrl(form));
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = form.attachmentName || `${form.formId}-attachment`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      await modal.showError(error instanceof Error ? error.message : 'Unable to download this file.', 'Download Failed');
    }
  };

  const handleReplaceAttachment = async (form: FormRecord, file: File) => {
    setReplacingFileIds(prev => new Set(prev).add(form.id));

    try {
      const uploadResult = await uploadFile(file);
      await updateFormAPI(parseInt(form.id), {
        fileName: file.name,
        fileUrl: uploadResult.url,
        fileType: file.type,
      });

      setForms(prev =>
        prev.map(current =>
          current.id === form.id
            ? {
              ...current,
              attachmentName: file.name,
              attachmentUrl: uploadResult.url,
              attachmentType: normalizeType(file.name),
            }
            : current
        )
      );
    } catch (error) {
      console.error('Failed to replace form attachment:', error);
      await modal.showError('Failed to replace the attached file. Please try again.', 'Replace File Failed');
    } finally {
      setReplacingFileIds(prev => {
        const next = new Set(prev);
        next.delete(form.id);
        return next;
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFormTypeFilter('All');
    setStatusFilter('All');
  };

  const normalizeType = (name?: string): 'pdf' | 'image' | 'doc' | 'docx' | undefined => {
    if (!name) return undefined;
    if (/\.(pdf)$/i.test(name)) return 'pdf';
    if (/\.(png|jpe?g|webp|gif|heic)$/i.test(name)) return 'image';
    if (/\.(docx?|rtf)$/i.test(name)) return name.toLowerCase().endsWith('docx') ? 'docx' : 'doc';
    return undefined;
  };

  const handleCreateForm = async (payload: Omit<FormRecord, 'id' | 'createdAt' | 'isArchived'> & { file: File }) => {
    if (!user?.User_ID) {
      console.error('User not authenticated');
      await modal.showError('You must be signed in to create a form.', 'Error');
      throw new Error('You must be signed in to create a form.');
    }

    if (!payload.file) {
      await modal.showError('Please attach a file before creating the form.', 'File Required');
      throw new Error('Please attach a file before creating the form.');
    }

    try {
      const uploadResult = await uploadFile(payload.file);
      const fileUrl = uploadResult.url;

      const createdForm = await createForm({
        creatorId: user.User_ID,
        formType: payload.type,
        title: payload.formId,
        content: payload.department,
        fileName: payload.file?.name,
        fileUrl: fileUrl,
        fileType: payload.file?.type,
        department: payload.department as any,
        requesterName: payload.requesterName,
        remarks: payload.remarks,
      });

      setForms(prev => {
        // Prevent duplicate Key error if WebSocket already refreshed the list
        if (prev.some(f => f.id === createdForm.Form_ID.toString())) {
          return prev;
        }
        return [mapFormToRecord(createdForm), ...prev];
      });
    } catch (error) {
      console.error('Failed to create form:', error);
      const message = error instanceof Error ? error.message : 'Failed to create form. Please try again.';
      await modal.showError(message, 'Error');
      throw new Error(message);
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
      const currentForm = forms.find(f => f.id === id);
      const needsFormUpdate = edits.status !== undefined || edits.remarks !== undefined;

      // 1. Handle form field updates
      if (needsFormUpdate) {
        await updateFormAPI(parseInt(id), {
          status: edits.status as any,
          // Preserve the existing title/form code if only remarks changed.
          title: currentForm?.formId || '',
          remarks: edits.remarks,
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
          form.id === f.id ? { ...form, isArchived: true, status: 'ARCHIVED' } : form
        )
      );
      setExpandedRow(null);
    } catch (error) {
      console.error('Failed to archive form:', error);
      await modal.showError('Failed to archive form. Please try again.', 'Error');
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
      {/* Header section */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Form Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage service requests and internal forms</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Toggle */}
          <div className="flex rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
            <button
              onClick={() => setShowArchived(false)}
              className={`inline-flex items-center gap-2 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${!showArchived
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
            >
              <Inbox className="h-4 w-4" />
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`inline-flex items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${showArchived
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
            >
              <Archive className="h-4 w-4" />
              Archived
            </button>
          </div>

          <div className="flex items-center gap-4 border-l border-gray-200 dark:border-gray-700 pl-4">
            <button
              onClick={() => loadForms()}
              className="p-2 text-gray-500 hover:text-indigo-600 transition-colors dark:text-gray-400 dark:hover:text-indigo-400"
              title="Refresh Forms"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              Add Form
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="min-w-[280px] flex-1">
          <Search
            searchTerm={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by filename or form code..."
            showLabel={false}
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={formTypeFilter}
            onChange={(e) => setFormTypeFilter(e.target.value as FormType | 'All')}
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            {(['All', 'WRF', 'RIS'] as const).map((type) => (
              <option key={type} value={type}>
                {type === 'All' ? 'All Types' : type}
              </option>
            ))}
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FormStatus | 'All')}
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <option value="All">All Statuses</option>
            {(['PENDING', 'APPROVED', 'REJECTED', 'IN_REVIEW', 'ARCHIVED'] as FormStatus[]).map((status) => (
              <option key={status} value={status}>
                {formStatusLabels[status]}
              </option>
            ))}
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Results Count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span>
          <span>results found</span>
        </div>
      </div>

      {/* Table section */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : (
          <Table headers={tableHeaders} columnWidths="4fr 2fr 2fr 2fr 2fr">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 w-full min-h-full" data-full-row>
                <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-4">
                  {showArchived ? (
                    <Archive className="h-12 w-12 text-gray-400" />
                  ) : (
                    <Inbox className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {hasActiveFilters ? "No forms match your filters" : `No ${showArchived ? 'archived' : 'active'} forms`}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm px-6">
                  {hasActiveFilters
                    ? "Try adjusting your search or filter criteria"
                    : showArchived
                      ? "Archived reports are stored here for long-term tracking."
                      : "You're all caught up! New form submissions from staff and students will appear here."}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-6 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              filtered.flatMap(f => [
                <button
                  key={`${f.id}-row`}
                  type="button"
                  onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                  className="group w-full cursor-pointer items-center text-left transition-all duration-150 hover:bg-indigo-50/50 focus:bg-indigo-50 focus:outline-none dark:hover:bg-indigo-900/10 dark:focus:bg-indigo-900/20"
                >
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <RowPreview url={f.attachmentUrl} name={f.attachmentName} type={f.attachmentType} />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                      {f.attachmentName || 'No file'}
                    </span>
                  </div>

                  <span className="text-sm text-gray-700 dark:text-gray-300">{f.formId}</span>

                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusChip[f.status as FormStatus] || statusChip.ARCHIVED}`}>
                      {formStatusLabels[f.status as FormStatus] || f.status}
                    </span>
                  </div>

                  <span className="text-sm text-gray-700 dark:text-gray-300">{formDepartmentLabels[f.department as FormDepartment] || f.department}</span>

                  <div className="flex items-center justify-end">
                    <div className="p-1.5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {expandedRow === f.id ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>,
                expandedRow === f.id && (
                  <div key={`${f.id}-exp`} data-full-row className="p-6 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-5 flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Processing Timeline
                          </h4>
                          <div className="p-2">
                            <InlineTimeline
                              steps={getTimelineStepsForType(f.type)}
                              current={formDepartmentLabels[f.department as FormDepartment] || f.department}
                              completedSteps={f.history?.map(h => h.dept) || []}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-2 space-y-5">
                        {/* Save Actions Logic */}
                        {editedForms[f.id] && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between animate-fadeIn">
                            <div className="text-sm text-blue-900 dark:text-blue-200 font-medium">
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
                                  <Check className="w-4 h-4" />
                                )}
                                Save Changes
                              </button>
                              <button
                                onClick={() => handleCancel(f.id)}
                                disabled={savingIds.has(f.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded shadow transition-colors"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Update Status
                          </h4>
                          <div className="w-full">
                            <StatusSelect
                              value={editedForms[f.id]?.status ?? f.status}
                              onChange={(s: FormStatus) => handleLocalChange(f.id, 'status', s)}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Transfer Department
                          </h4>
                          <div className="w-full">
                            <DeptSelect
                              value={editedForms[f.id]?.department ?? f.department}
                              onChange={(d: FormDepartment) => handleLocalChange(f.id, 'department', d)}
                              formType={f.type}
                              departments={getAvailableTransferDepartments(
                                f.type,
                                f.department,
                                f.history?.map(h => h.dept) || []
                              )}
                              className="w-full"
                            />
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Departments unlock in workflow order after each previous step has been visited.
                            </p>
                          </div>
                        </div>

                        {/* Remarks / Notes */}
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Remarks / Notes
                          </h4>
                          <textarea
                            value={editedForms[f.id]?.remarks ?? f.remarks ?? ''}
                            onChange={(e) => handleLocalChange(f.id, 'remarks', e.target.value)}
                            placeholder="Add remarks or notes..."
                            rows={3}
                            className="block w-full pl-3 pr-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 hover:border-gray-400 dark:hover:border-gray-500 resize-none"
                          />
                          {f.requesterName && (
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Requester:</span> {f.requesterName}
                            </p>
                          )}
                        </div>

                        <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" />
                            </svg>
                            File Actions
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            <input
                              ref={(node) => {
                                fileInputRefs.current[f.id] = node;
                              }}
                              type="file"
                              className="hidden"
                              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.rtf"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) void handleReplaceAttachment(f, file);
                              }}
                            />
                            {f.attachmentUrl ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handlePreviewFile(f)}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadFile(f)}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">No file attached</span>
                            )}
                            <button
                              type="button"
                              disabled={replacingFileIds.has(f.id)}
                              onClick={() => fileInputRefs.current[f.id]?.click()}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0-12l-4 4m4-4l4 4" />
                              </svg>
                              {replacingFileIds.has(f.id) ? 'Replacing...' : f.attachmentUrl ? 'Replace File' : 'Upload File'}
                            </button>
                            <button
                              type="button"
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
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ]).flat().filter(Boolean)
            )}
          </Table>
        )}
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
