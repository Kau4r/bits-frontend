import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Table from '@/components/Table';
import Search from '@/components/Search';
import { AddFormDialog } from '@/pages/labtech/components/AddFormDialog';
import { InlineTimeline } from '@/pages/labtech/components/InlineTimeline';
import { StatusSelect } from '@/pages/labtech/components/StatusSelect';
import { DeptSelect } from '@/pages/labtech/components/DeptSelect';
import type { FormRecord, FormStatus, FormType, FormDepartment, FormAttachmentRecord, FormDocumentType, FormHistoryAction } from '@/types/formtypes';
import {
  formStatusColors,
  formStatusLabels,
  formDocumentTypeLabels,
  formTypeLabels,
  formDepartmentLabels,
  getTimelineStepsForType,
  getTransferDepartmentOptions,
  hasCurrentStepAttachment,
  normalizeFormDepartment,
  getDepartmentsForType,
} from '@/types/formtypes';
import { getForms, createForm, updateForm as updateFormAPI, transferForm, uploadFile, addFormAttachment, deleteFormAttachment, resolveFormFileUrl, archiveForm, unarchiveForm, deleteForm } from '@/services/forms';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useNotifications } from '@/context/NotificationContext';
import { Check, X, Plus, Archive, Inbox, RefreshCw, Lock, CornerUpLeft, Info, Eye, Download, Pencil, Trash2, FileText, Image as ImageIcon, File } from 'lucide-react';
import type { Form } from '@/types/formtypes';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { LoadingSkeleton } from '@/ui';
import ReturnForRevisionModal from '@/pages/labtech/components/ReturnForRevisionModal';

// Use the imported formStatusColors for status chips
const statusChip = formStatusColors;

const normalizeAttachmentType = (name?: string): 'pdf' | 'image' | 'doc' | 'docx' | undefined => {
  if (!name) return undefined;
  if (/\.(pdf)$/i.test(name)) return 'pdf';
  if (/\.(png|jpe?g|webp|gif|heic)$/i.test(name)) return 'image';
  if (/\.(docx?|rtf)$/i.test(name)) return name.toLowerCase().endsWith('docx') ? 'docx' : 'doc';
  return undefined;
};

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
  // 'COMPLETED' is exposed as a filter value even though the schema currently
  // tracks completion via Department === 'COMPLETED' (separate from Status).
  const [statusFilter, setStatusFilter] = useState<FormStatus | 'COMPLETED' | 'All'>('All');
  const [loading, setLoading] = useState(true);

  const tableHeaders = [
    { label: <span className="pl-4">Title</span>, key: 'title' },
    { label: 'Form Number', key: 'formNumber' },
    { label: 'Department', key: 'department' },
    { label: 'Status', key: 'status' },
    { label: 'Attached Files', key: 'attachments' },
    { label: 'Created At', key: 'createdAt' },
    { label: 'Actions', align: 'right' as const }
  ];

  const formatCreatedAt = (iso?: string) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFormTypeDisplay = (type: FormType | string) => type === 'WRF' ? 'WRF' : 'RIS';

  const getFormNumberChipClass = (type: FormType | string) =>
    type === 'WRF'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
      : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300';

  const getAttachmentCountLabel = (form: FormRecord) => {
    const count = form.attachments?.length || 0;
    return `${count} ${count === 1 ? 'file' : 'files'}`;
  };

  const getDisplayStatusLabel = (form: FormRecord) =>
    form.department === 'COMPLETED'
      ? 'Completed'
      : formStatusLabels[form.status as FormStatus] || form.status;

  const getDisplayStatusClass = (form: FormRecord) =>
    form.department === 'COMPLETED'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : statusChip[form.status as FormStatus] || statusChip.ARCHIVED;

  const getLastHistoryEntry = (form: FormRecord) =>
    [...(form.history || [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];

  // Local state for buffered edits: formId -> partial updates
  const [editedForms, setEditedForms] = useState<Record<string, Partial<FormRecord>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [uploadingAttachmentIds, setUploadingAttachmentIds] = useState<Set<string>>(new Set());
  const [archivingIds, setArchivingIds] = useState<Set<string>>(new Set());
  const [unarchivingIds, setUnarchivingIds] = useState<Set<string>>(new Set());
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<Set<string>>(new Set());
  const [deletingFormIds, setDeletingFormIds] = useState<Set<string>>(new Set());
  const [editingCompletedIds, setEditingCompletedIds] = useState<Set<string>>(new Set());
  const [returnModalFormId, setReturnModalFormId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Terminal check for local FormRecord (no FormRecord `Department`/`Status` casing — project `Is_*` equivalents)
  const isRecordTerminal = useCallback((form: FormRecord): boolean =>
    form.department === 'COMPLETED' || form.status === 'CANCELLED' || form.status === 'ARCHIVED', []);
  const isCompletedRecord = (form: FormRecord): boolean => form.department === 'COMPLETED';
  const canEditWorkflow = (form: FormRecord): boolean =>
    !isRecordTerminal(form) || (isCompletedRecord(form) && editingCompletedIds.has(form.id));

  // True if the form has visited at least one workflow step earlier than its current step.
  const hasPriorVisitedStep = useCallback((form: FormRecord): boolean => {
    const workflow = getDepartmentsForType(form.type);
    const normalizedCurrent = normalizeFormDepartment(form.department);
    const currentIndex = normalizedCurrent ? workflow.indexOf(normalizedCurrent) : -1;
    if (currentIndex <= 0) return false;

    const visited = new Set<FormDepartment>();
    (form.history || []).forEach(entry => {
      const normalized = normalizeFormDepartment(entry.dept);
      if (normalized) visited.add(normalized);
    });
    return workflow.slice(0, currentIndex).some(step => visited.has(step));
  }, []);

  // Helper to map API Form to local FormRecord
  const mapFormToRecord = useCallback((form: Form): FormRecord => {
    const attachments: FormAttachmentRecord[] = (form.Attachments || []).map(attachment => {
      const uploader = attachment.Uploader
        ? `${attachment.Uploader.First_Name} ${attachment.Uploader.Last_Name}`.trim()
        : undefined;

      return {
        id: attachment.Attachment_ID.toString(),
        department: attachment.Department,
        documentType: attachment.Document_Type || 'PROOF',
        fileName: attachment.File_Name,
        fileUrl: resolveFormFileUrl(attachment.File_URL) || attachment.File_URL,
        fileType: normalizeAttachmentType(attachment.File_Name),
        uploadedAt: attachment.Uploaded_At,
        uploadedByName: uploader,
        notes: attachment.Notes || undefined,
      };
    });

    if (attachments.length === 0 && form.File_URL && form.File_Name) {
      attachments.push({
        id: `legacy-${form.Form_ID}`,
        department: form.Department,
        documentType: 'INITIAL',
        fileName: form.File_Name,
        fileUrl: resolveFormFileUrl(form.File_URL) || form.File_URL,
        fileType: normalizeAttachmentType(form.File_Name),
        uploadedAt: form.Created_At,
        notes: 'Initial form attachment',
      });
    }

    const primaryAttachment = attachments[0];

    return {
      id: form.Form_ID.toString(),
      formNumber: form.Form_Code,
      title: form.Title || form.Form_Code,
      type: form.Form_Type,
      status: form.Status,
      department: form.Department,
      createdAt: form.Created_At,
      isArchived: form.Is_Archived,
      attachmentName: primaryAttachment?.fileName,
      attachmentUrl: primaryAttachment?.fileUrl,
      attachmentType: primaryAttachment?.fileType,
      attachments,
      isReceived: form.Is_Received === true,
      receivedAt: form.Received_At || null,
      receivedByName: form.Receiver
        ? `${form.Receiver.First_Name} ${form.Receiver.Last_Name}`.trim()
        : undefined,
      history: form.History?.map(h => ({
        dept: h.Department,
        at: h.Changed_At,
        action: h.Action,
        performedByName: h.Performer
          ? `${h.Performer.First_Name} ${h.Performer.Last_Name}`.trim()
          : null,
        reason: h.Reason ?? null,
      })) || [],
      requesterName: form.Requester_Name || undefined,
      remarks: form.Remarks || undefined,
    };
  }, []);

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
    const q = searchTerm.trim().toLowerCase();
    const searchableTextForForm = (form: FormRecord) => {
      const typeAliases = [
        form.type,
        formTypeLabels[form.type],
        form.type.startsWith('RIS') ? 'RIS' : '',
        form.type === 'WRF' ? 'WRF' : '',
      ];
      const statusAliases = [
        form.status,
        formStatusLabels[form.status],
        form.department === 'COMPLETED' ? 'Completed' : '',
      ];
      const departmentAliases = [
        form.department,
        formDepartmentLabels[form.department as FormDepartment],
      ];
      const attachmentText = (form.attachments || []).flatMap(attachment => [
        attachment.fileName,
        attachment.fileType,
        attachment.documentType,
        attachment.documentType ? formDocumentTypeLabels[attachment.documentType] : '',
        attachment.department,
        attachment.department ? formDepartmentLabels[attachment.department] : '',
        attachment.uploadedByName,
        attachment.notes,
        attachment.uploadedAt,
      ]);
      const historyText = (form.history || []).flatMap(entry => [
        entry.dept,
        formDepartmentLabels[entry.dept as FormDepartment],
        entry.performedByName,
        entry.reason,
        entry.action,
        entry.at,
      ]);

      return [
        form.title,
        form.formNumber,
        form.requesterName,
        form.remarks,
        form.createdAt,
        form.attachmentName,
        form.attachmentType,
        `${form.attachments?.length || 0} files`,
        form.isArchived ? 'archived' : 'active',
        form.isReceived ? 'received' : '',
        form.receivedByName,
        form.receivedAt,
        ...typeAliases,
        ...statusAliases,
        ...departmentAliases,
        ...attachmentText,
        ...historyText,
      ].filter(Boolean).join(' ').toLowerCase();
    };

    return forms
      .filter(f => (showArchived ? f.isArchived : !f.isArchived))
      .filter(f => {
        const matchesSearch = q === '' || searchableTextForForm(f).includes(q);
        const matchesFormType = formTypeFilter === 'All' || f.type === formTypeFilter;
        const isCompleted = f.department === 'COMPLETED';
        // 'Completed' is presented as its own filter value; everything else
        // matches against the underlying form Status while excluding completed forms
        // (so an APPROVED-but-completed form doesn't double-count under "Approved").
        const matchesStatus =
          statusFilter === 'All'
          || (statusFilter === 'COMPLETED' ? isCompleted : !isCompleted && f.status === statusFilter);
        return matchesSearch && matchesFormType && matchesStatus;
      });
  }, [forms, searchTerm, showArchived, formTypeFilter, statusFilter]);

  const hasActiveFilters = searchTerm !== '' || formTypeFilter !== 'All' || statusFilter !== 'All';

  const getFormDownloadUrl = (form: FormRecord) =>
    resolveFormFileUrl(form.attachmentUrl, {
      download: true,
      fileName: form.attachmentName || form.formNumber,
    }) || form.attachmentUrl;

  const fetchAttachmentBlob = async (url?: string) => {
    if (!url) throw new Error('No file is attached to this form.');

    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      throw new Error('The attached file is missing from the server. Please upload the file again.');
    }

    if (contentType.includes('text/html')) {
      throw new Error('The file link points to the website page instead of an uploaded file. Please upload the file again.');
    }

    return response.blob();
  };

  const handlePreviewFile = async (form: FormRecord) => {
    const previewWindow = window.open('', '_blank');

    if (!previewWindow) {
      await modal.showError('Your browser blocked the preview popup. Please allow popups and try again.', 'Preview Blocked');
      return;
    }

    previewWindow.document.title = form.attachmentName || `${form.formNumber} preview`;
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
      link.download = form.attachmentName || `${form.formNumber}-attachment`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      await modal.showError(error instanceof Error ? error.message : 'Unable to download this file.', 'Download Failed');
    }
  };

  const formHasCurrentStepAttachment = (form: FormRecord): boolean => {
    const currentDept = normalizeFormDepartment(form.department);
    if (!currentDept) return true;
    return hasCurrentStepAttachment(
      currentDept,
      form.history,
      form.attachments || [],
      form.createdAt,
    );
  };

  const getCurrentStepLabel = (form: FormRecord): string => {
    const currentDept = normalizeFormDepartment(form.department);
    return currentDept ? (formDepartmentLabels[currentDept] ?? currentDept) : form.department;
  };

  const handleAddAttachments = async (form: FormRecord, selectedFiles: File[], documentType: FormDocumentType) => {
    if (selectedFiles.length === 0) return;

    setUploadingAttachmentIds(prev => new Set(prev).add(form.id));

    try {
      let updatedForm: Form | null = null;

      for (const file of selectedFiles) {
        const uploadResult = await uploadFile(file);
        updatedForm = await addFormAttachment(parseInt(form.id), {
          fileName: file.name,
          fileUrl: uploadResult.url,
          fileType: file.type,
          department: form.department as FormDepartment,
          documentType,
          notes: `${formDocumentTypeLabels[documentType]} uploaded for ${formDepartmentLabels[form.department as FormDepartment] || form.department}`,
        });
      }

      if (updatedForm) {
        const updatedRecord = mapFormToRecord(updatedForm);
        setForms(prev => prev.map(current => current.id === form.id ? updatedRecord : current));
      }
    } catch (error) {
      console.error('Failed to add form attachment:', error);
      await modal.showError('Failed to add the selected file(s). Please try again.', 'Upload File Failed');
    } finally {
      setUploadingAttachmentIds(prev => {
        const next = new Set(prev);
        next.delete(form.id);
        return next;
      });
    }
  };

  const handleRemoveAttachment = async (form: FormRecord, attachmentId: string) => {
    const numericAttachmentId = Number(attachmentId);
    if (!Number.isFinite(numericAttachmentId)) {
      await modal.showError('This attachment cannot be removed because it does not have a valid server ID.', 'Remove File Failed');
      return;
    }

    const confirmed = await modal.showConfirm('Remove this attachment from the form?', 'Remove Attachment');
    if (!confirmed) return;

    setDeletingAttachmentIds(prev => new Set(prev).add(attachmentId));

    try {
      const updatedForm = await deleteFormAttachment(Number(form.id), numericAttachmentId);
      const updatedRecord = mapFormToRecord(updatedForm);
      setForms(prev => prev.map(current => current.id === form.id ? updatedRecord : current));
    } catch (error) {
      console.error('Failed to remove form attachment:', error);
      await modal.showError(error instanceof Error ? error.message : 'Failed to remove the attachment.', 'Remove File Failed');
    } finally {
      setDeletingAttachmentIds(prev => {
        const next = new Set(prev);
        next.delete(attachmentId);
        return next;
      });
    }
  };

  const handleArchiveForm = async (form: FormRecord) => {
    if (!isRecordTerminal(form)) {
      await modal.showError('Form must be Completed or Cancelled before archiving.', 'Archive Blocked');
      return;
    }

    setArchivingIds(prev => new Set(prev).add(form.id));
    try {
      const archived = await archiveForm(parseInt(form.id));
      const updatedRecord = mapFormToRecord(archived);
      setForms(prev => prev.map(current => current.id === form.id ? updatedRecord : current));
    } catch (error) {
      console.error('Failed to archive form:', error);
      await modal.showError(error instanceof Error ? error.message : 'Failed to archive this form.', 'Archive Failed');
    } finally {
      setArchivingIds(prev => {
        const next = new Set(prev);
        next.delete(form.id);
        return next;
      });
    }
  };

  const handleUnarchiveForm = async (form: FormRecord) => {
    setUnarchivingIds(prev => new Set(prev).add(form.id));
    try {
      const restored = await unarchiveForm(parseInt(form.id));
      const updatedRecord = mapFormToRecord(restored);
      setForms(prev => prev.map(current => current.id === form.id ? updatedRecord : current));
    } catch (error) {
      console.error('Failed to unarchive form:', error);
      await modal.showError(error instanceof Error ? error.message : 'Failed to unarchive this form.', 'Unarchive Failed');
    } finally {
      setUnarchivingIds(prev => {
        const next = new Set(prev);
        next.delete(form.id);
        return next;
      });
    }
  };

  const handleDeleteForm = async (form: FormRecord) => {
    const confirmed = await modal.showConfirm(
      `Delete form ${form.formNumber}? This cannot be undone.`,
      'Delete Form'
    );
    if (!confirmed) return;

    setDeletingFormIds(prev => new Set(prev).add(form.id));
    try {
      await deleteForm(parseInt(form.id));
      setForms(prev => prev.filter(current => current.id !== form.id));
      setEditedForms(prev => {
        const next = { ...prev };
        delete next[form.id];
        return next;
      });
      if (expandedRow === form.id) setExpandedRow(null);
    } catch (error) {
      console.error('Failed to delete form:', error);
      await modal.showError(error instanceof Error ? error.message : 'Failed to delete this form.', 'Delete Failed');
    } finally {
      setDeletingFormIds(prev => {
        const next = new Set(prev);
        next.delete(form.id);
        return next;
      });
    }
  };

  const handleReturnSuccess = (updated: Form) => {
    const updatedRecord = mapFormToRecord(updated);
    setForms(prev => prev.map(current => current.id === updatedRecord.id ? updatedRecord : current));
    setEditedForms(prev => {
      const next = { ...prev };
      delete next[updatedRecord.id];
      return next;
    });
  };

  const returnModalForm = useMemo<Form | null>(() => {
    if (!returnModalFormId) return null;
    const record = forms.find(f => f.id === returnModalFormId);
    if (!record) return null;
    // Synthesize a minimal Form object from the FormRecord for the modal.
    // The modal only reads: Form_ID, Form_Code, Form_Type, Department, Status, History.
    return {
      Form_ID: parseInt(record.id),
      Form_Code: record.formNumber,
      Creator_ID: 0,
      Form_Type: record.type,
      Status: record.status,
      Department: (normalizeFormDepartment(record.department) || 'REQUESTOR') as FormDepartment,
      Is_Archived: record.isArchived,
      Created_At: record.createdAt,
      Updated_At: record.createdAt,
      History: (record.history || []).map((entry, index) => ({
        History_ID: index,
        Form_ID: parseInt(record.id),
        Department: (normalizeFormDepartment(entry.dept) || 'REQUESTOR') as FormDepartment,
        Changed_At: entry.at,
        Action: entry.action as FormHistoryAction | undefined,
        Reason: entry.reason ?? null,
      })),
    } satisfies Form;
  }, [returnModalFormId, forms]);

  const clearFilters = () => {
    setSearchTerm('');
    setFormTypeFilter('All');
    setStatusFilter('All');
  };

  const handleCreateForm = async (payload: Omit<FormRecord, 'id' | 'createdAt' | 'isArchived'> & { files: File[] }) => {
    if (!user?.User_ID) {
      console.error('User not authenticated');
      await modal.showError('You must be signed in to create a form.', 'Error');
      throw new Error('You must be signed in to create a form.');
    }

    // File is always required to ensure the WRF/RIS copy is uploaded.
    if (!payload.files || payload.files.length === 0) {
      await modal.showError('Please attach the WRF or RIS copy before creating the form.', 'File Required');
      throw new Error('Please attach the WRF or RIS copy before creating the form.');
    }

    try {
      const uploadedFiles = [];
      for (const file of (payload.files || [])) {
        const uploadResult = await uploadFile(file);
        uploadedFiles.push({ file, uploadResult });
      }

      const primaryUpload = uploadedFiles[0];

      const createdForm = await createForm({
        creatorId: user.User_ID,
        formType: payload.type,
        formNumber: payload.formNumber,
        title: payload.title,
        content: payload.department,
        fileName: primaryUpload?.file.name,
        fileUrl: primaryUpload?.uploadResult.url,
        fileType: primaryUpload?.file.type,
        attachments: uploadedFiles.map(({ file, uploadResult }) => ({
          fileName: file.name,
          fileUrl: uploadResult.url,
          fileType: file.type,
          department: payload.department as FormDepartment,
          documentType: 'INITIAL',
          notes: 'Initial form attachment',
        })),
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
      if (!currentForm) return;

      if (edits.department === 'COMPLETED' && !formHasCurrentStepAttachment(currentForm)) {
        await modal.showError(
          `Upload the completed form for ${getCurrentStepLabel(currentForm)} before marking this form Completed.`,
          'Upload Required'
        );
        return;
      }

      const isDepartmentTransfer = edits.department !== undefined;
      const effectiveStatus = edits.status ?? currentForm.status;

      if (isDepartmentTransfer && effectiveStatus !== 'APPROVED') {
        await modal.showError('Set this form status to Approved before transferring it to another department.', 'Approval Required');
        return;
      }

      const needsFormUpdate = edits.status !== undefined || edits.remarks !== undefined;
      let savedForm: Form | null = null;

      // 1. Save status/remarks first. Transfers are allowed only after approval.
      if (needsFormUpdate) {
        savedForm = await updateFormAPI(parseInt(id), {
          status: edits.status as any,
          title: currentForm?.title || currentForm?.formNumber || '',
          remarks: edits.remarks,
        });
      }

      // 2. Transfer department. The backend resets the transferred form to Pending.
      if (isDepartmentTransfer) {
        savedForm = await transferForm(parseInt(id), edits.department as any, `Transferred to ${edits.department}`);
      }

      // Success: Apply changes locally and clear edit state
      if (savedForm) {
        const updatedRecord = mapFormToRecord(savedForm);
        setForms(prev => prev.map(f => f.id === id ? updatedRecord : f));
      } else {
        setForms(prev => prev.map(f => f.id === id ? { ...f, ...edits } : f));
      }

      setEditedForms(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditingCompletedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

    } catch (error) {
      console.error('Failed to save form:', error);
      await modal.showError(error instanceof Error ? error.message : 'Failed to save changes. Please try again.', 'Error');
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
    setEditingCompletedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
            placeholder="Search by title, filename, or form number..."
            showLabel={false}
          />
        </div>

        {/* Type Filter */}
        <div className="min-w-40">
          <FloatingSelect
            id="forms-type-filter"
            value={formTypeFilter}
            placeholder="All Types"
            options={[
              { value: 'All', label: 'All Types' },
              { value: 'RIS_E', label: formTypeLabels.RIS_E },
              { value: 'RIS_NE', label: formTypeLabels.RIS_NE },
              { value: 'WRF', label: 'WRF' },
            ]}
            onChange={(type) => setFormTypeFilter(type as FormType | 'All')}
          />
        </div>

        {/* Status Filter */}
        <div className="min-w-48">
          <FloatingSelect
            id="forms-status-filter"
            value={statusFilter}
            placeholder="All Statuses"
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'PENDING', label: formStatusLabels.PENDING },
              { value: 'IN_REVIEW', label: formStatusLabels.IN_REVIEW },
              { value: 'APPROVED', label: formStatusLabels.APPROVED },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: formStatusLabels.CANCELLED },
            ]}
            onChange={(status) => setStatusFilter(status as FormStatus | 'COMPLETED' | 'All')}
          />
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
          <LoadingSkeleton type="table-rows" columns={7} rows={6} />
        ) : (
          <Table headers={tableHeaders} columnWidths="1.5fr 2fr 1.5fr 1.5fr 1.5fr 2fr 0.75fr">
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
              filtered.flatMap(f => {
                const attachmentCountLabel = getAttachmentCountLabel(f);

                return [
                  <button
                    key={`${f.id}-row`}
                    type="button"
                    onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                    className="group w-full cursor-pointer items-center text-left transition-all duration-150 hover:bg-indigo-50/50 focus:bg-indigo-50 focus:outline-none dark:hover:bg-indigo-900/10 dark:focus:bg-indigo-900/20"
                  >
                    <div className="min-w-0 pl-4">
                      <span className="block max-w-[220px] truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {f.title || f.formNumber}
                      </span>
                    </div>

                  <span className={`rounded-full px-2 py-1 text-xs font-mono font-semibold ${getFormNumberChipClass(f.type)}`}>
                    {f.formNumber || getFormTypeDisplay(f.type)}
                  </span>

                  <span className="text-sm text-gray-700 dark:text-gray-300">{formDepartmentLabels[f.department as FormDepartment] || f.department}</span>

                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDisplayStatusClass(f)}`}>
                      {getDisplayStatusLabel(f)}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                      {attachmentCountLabel}
                    </span>
                  </div>

                  <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatCreatedAt(f.createdAt)}
                  </span>

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
                  <div key={`${f.id}-exp`} data-full-row className="p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(240px,0.24fr)_minmax(0,1fr)]">
                      <div>
                        <div className="flex h-full flex-col bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Processing Timeline
                          </h4>
                          <div className="p-1">
                            <InlineTimeline
                              steps={getTimelineStepsForType(f.type)}
                              current={formDepartmentLabels[f.department as FormDepartment] || f.department}
                              completedSteps={f.history?.map(h => h.dept) || []}
                              history={f.history || []}
                              compact
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Terminal-state lock banner */}
                        {isRecordTerminal(f) && (
                          <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-100 dark:bg-gray-800/70 dark:border-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            <Lock className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                            <span>
                              {isCompletedRecord(f) && editingCompletedIds.has(f.id)
                                ? 'Completed form editing is enabled. Save or lock it when finished.'
                                : f.status === 'CANCELLED'
                                  ? 'This form is Cancelled and is locked from further changes.'
                                  : f.status === 'ARCHIVED'
                                    ? 'This form is Archived and is locked from further changes.'
                                    : 'This form is already marked Completed. Use Edit to make changes.'}
                            </span>
                          </div>
                        )}

                        {/* Row actions: Return for Revision */}
                        {!isRecordTerminal(f) && hasPriorVisitedStep(f) && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setReturnModalFormId(f.id)}
                              className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-500/10 transition-colors"
                            >
                              <CornerUpLeft className="h-4 w-4" />
                              Return for Revision
                            </button>
                          </div>
                        )}

                        {/* Save Actions Logic */}
                        {canEditWorkflow(f) && editedForms[f.id] && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 rounded-lg px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fadeIn">
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

                        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
                          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
                          <div className="h-full">
                            {(() => {
                              const lastEntry = getLastHistoryEntry(f);
                              const lastUpdatedBy = lastEntry?.performedByName || f.receivedByName || 'System';
                              const lastUpdatedAt = lastEntry?.at || f.receivedAt || f.createdAt;

                              return (
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                                  <h4 className="mb-4 text-sm font-medium text-gray-900 dark:text-gray-300 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-blue-500" />
                                    Form Details
                                  </h4>
                                  <div className="grid gap-3">
                                    <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60">
                                      <p className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">Last Update</p>
                                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{formatCreatedAt(lastUpdatedAt)}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60">
                                      <p className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">Updated By</p>
                                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{lastUpdatedBy}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60">
                                      <p className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">Requestor</p>
                                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{f.requesterName || 'Not specified'}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="flex h-full min-h-0 flex-col gap-4">
                        {(!isRecordTerminal(f) || isCompletedRecord(f)) && (
                          <div className="grid h-full flex-1 auto-rows-fr gap-4">
                          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-full">
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
                                disabled={!canEditWorkflow(f)}
                              />
                            </div>
                          </div>

                          <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Transfer Department
                            </h4>
                            <div className="w-full">
                              {(() => {
                                const isApproved = (editedForms[f.id]?.status ?? f.status) === 'APPROVED';
                                const deptSelectDisabled = !canEditWorkflow(f) || !isApproved;

                                return (
                                  <>
                                    <DeptSelect
                                      value={editedForms[f.id]?.department ?? f.department}
                                      onChange={(d: FormDepartment) => handleLocalChange(f.id, 'department', d)}
                                      formType={f.type}
                                      disabled={deptSelectDisabled}
                                      options={getTransferDepartmentOptions(
                                        f.type,
                                        f.department,
                                        f.history?.map(h => h.dept) || []
                                      ).map(option => ({
                                        ...option,
                                        disabled: option.disabled
                                          || (option.value === 'COMPLETED' && !formHasCurrentStepAttachment(f))
                                      }))}
                                      className="w-full"
                                    />
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          </div>
                        )}

                          </div>
                          </div>

                        <div className="flex h-full max-h-72 min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="mb-4 flex items-center gap-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300 flex items-center gap-2">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" />
                              </svg>
                              Attachments
                            </h4>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col gap-3">
                            <input
                              ref={(node) => {
                                fileInputRefs.current[f.id] = node;
                              }}
                              type="file"
                              multiple
                              className="hidden"
                              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.rtf"
                              onChange={(event) => {
                                const selectedFiles = Array.from(event.target.files || []);
                                event.target.value = '';
                                if (selectedFiles.length > 0) void handleAddAttachments(f, selectedFiles, 'PROOF');
                              }}
                            />
                            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                              <button
                                type="button"
                                disabled={uploadingAttachmentIds.has(f.id)}
                                onClick={() => fileInputRefs.current[f.id]?.click()}
                                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-500 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-current">
                                  <Plus className="h-4 w-4" />
                                </span>
                                <span>{uploadingAttachmentIds.has(f.id) ? 'Uploading...' : 'Attach file'}</span>
                              </button>
                              {(f.attachments || []).length > 0 ? (
                                (f.attachments || []).map((attachment) => {
                                  const attachmentForm = {
                                    ...f,
                                    attachmentName: attachment.fileName,
                                    attachmentUrl: attachment.fileUrl,
                                    attachmentType: attachment.fileType,
                                  };

                                  return (
                                    <div key={attachment.id} className="group relative flex h-20 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                                      <button
                                        type="button"
                                        disabled={deletingAttachmentIds.has(attachment.id)}
                                        onClick={() => void handleRemoveAttachment(f, attachment.id)}
                                        className="absolute right-2 top-2 z-10 rounded-md border border-gray-200 bg-white p-1 text-gray-500 shadow-sm transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                                        title="Remove attachment"
                                        aria-label="Remove attachment"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                      <div className="absolute inset-0 flex items-center gap-2 p-3 pr-10 transition-opacity group-hover:opacity-0 group-focus-within:opacity-0">
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                                            attachment.fileType === 'pdf'
                                              ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300'
                                              : attachment.fileType === 'image'
                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                          }`}>
                                            {attachment.fileType === 'pdf' ? (
                                              <FileText className="h-4 w-4" />
                                            ) : attachment.fileType === 'image' ? (
                                              <ImageIcon className="h-4 w-4" />
                                            ) : (
                                              <File className="h-4 w-4" />
                                            )}
                                        </span>
                                        <p className="min-w-0 overflow-hidden break-words text-sm font-medium leading-5 text-gray-900 dark:text-gray-100">{attachment.fileName}</p>
                                      </div>
                                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                        <button
                                          type="button"
                                          onClick={() => void handlePreviewFile(attachmentForm)}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
                                          title="Preview"
                                          aria-label="Preview attachment"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleDownloadFile(attachmentForm)}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
                                          title="Download"
                                          aria-label="Download attachment"
                                        >
                                          <Download className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="flex min-h-20 items-center rounded-lg border border-dashed border-gray-200 px-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No files attached</span>
                              )}
                            </div>
                          </div>
                        </div>
                        </div>

                        {/* Remarks / Notes */}
                        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(170px,0.24fr)]">
                          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
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
                              className="block w-full pl-3 pr-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 hover:border-gray-400 dark:hover:border-[#475569] resize-none"
                            />
                          </div>
                          <div className="flex flex-col justify-end gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                            {isCompletedRecord(f) && !f.isArchived && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingCompletedIds.has(f.id)) {
                                    handleCancel(f.id);
                                    return;
                                  }
                                  setEditingCompletedIds(prev => new Set(prev).add(f.id));
                                }}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-gray-900 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                              >
                                <Pencil className="h-4 w-4" />
                                {editingCompletedIds.has(f.id) ? 'Lock' : 'Edit'}
                              </button>
                            )}
                            {!f.isArchived && (
                              <button
                                type="button"
                                disabled={!isRecordTerminal(f) || archivingIds.has(f.id)}
                                onClick={() => void handleArchiveForm(f)}
                                title={isRecordTerminal(f) ? 'Archive this form' : 'Form must be Completed or Cancelled before archiving'}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                              >
                                <Archive className="h-4 w-4" />
                                {archivingIds.has(f.id) ? 'Archiving...' : 'Archive'}
                              </button>
                            )}
                            {f.isArchived && (
                              <button
                                type="button"
                                disabled={unarchivingIds.has(f.id)}
                                onClick={() => void handleUnarchiveForm(f)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                              >
                                <CornerUpLeft className="h-4 w-4" />
                                {unarchivingIds.has(f.id) ? 'Unarchiving...' : 'Unarchive'}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={deletingFormIds.has(f.id)}
                              onClick={() => void handleDeleteForm(f)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/40 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingFormIds.has(f.id) ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ];
              }).flat().filter(Boolean)
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

      {returnModalForm && (
        <ReturnForRevisionModal
          isOpen={!!returnModalFormId}
          form={returnModalForm}
          onClose={() => setReturnModalFormId(null)}
          onSuccess={handleReturnSuccess}
        />
      )}
    </div>
  );
}
