import { useEffect, useState } from 'react';
import { Trash2, Pencil, X, Plus, Save } from 'lucide-react';
import {
    fetchSuggestions,
    createSuggestion,
    updateSuggestion,
    deleteSuggestion,
    type ComputerSuggestion,
} from '@/services/computerSuggestions';
import { useModal } from '@/context/ModalContext';

const formatItemType = (type: string) => {
    if (type === 'MINI_PC') return 'Mini PC';
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

const normalizeTypeInput = (raw: string) =>
    raw.trim().toUpperCase().replace(/[\s-]+/g, '_').replace(/[^A-Z0-9_]/g, '');

interface SuggestionManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableItemTypes: string[];
    onSuggestionsChanged?: (suggestions: ComputerSuggestion[]) => void;
}

interface DraftSuggestion {
    name: string;
    itemTypes: string[];
}

const emptyDraft = (): DraftSuggestion => ({ name: '', itemTypes: [] });

export default function SuggestionManagerModal({
    isOpen,
    onClose,
    availableItemTypes,
    onSuggestionsChanged,
}: SuggestionManagerModalProps) {
    const modal = useModal();
    const [suggestions, setSuggestions] = useState<ComputerSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [draft, setDraft] = useState<DraftSuggestion>(emptyDraft());
    const [typeInput, setTypeInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) load();
    }, [isOpen]);

    const load = async () => {
        setIsLoading(true);
        try {
            const data = await fetchSuggestions();
            setSuggestions(data);
            onSuggestionsChanged?.(data);
        } catch (err) {
            console.error('Failed to load suggestions:', err);
            setError('Failed to load suggestions');
        } finally {
            setIsLoading(false);
        }
    };

    const startNew = () => {
        setEditingId('new');
        setDraft(emptyDraft());
        setTypeInput('');
        setError(null);
    };

    const startEdit = (s: ComputerSuggestion) => {
        setEditingId(s.Suggestion_ID);
        setDraft({ name: s.Name, itemTypes: [...s.Item_Types] });
        setTypeInput('');
        setError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDraft(emptyDraft());
        setTypeInput('');
        setError(null);
    };

    const addType = (raw: string) => {
        const normalized = normalizeTypeInput(raw);
        if (!normalized) return;
        if (draft.itemTypes.includes(normalized)) return;
        setDraft(prev => ({ ...prev, itemTypes: [...prev.itemTypes, normalized] }));
        setTypeInput('');
    };

    const removeType = (type: string) => {
        setDraft(prev => ({ ...prev, itemTypes: prev.itemTypes.filter(t => t !== type) }));
    };

    const handleSave = async () => {
        if (!draft.name.trim()) {
            setError('Name is required');
            return;
        }
        if (draft.itemTypes.length === 0) {
            setError('Add at least one item type');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            if (editingId === 'new') {
                await createSuggestion({ name: draft.name.trim(), itemTypes: draft.itemTypes });
            } else if (typeof editingId === 'number') {
                await updateSuggestion(editingId, { name: draft.name.trim(), itemTypes: draft.itemTypes });
            }
            await load();
            cancelEdit();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save suggestion';
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (s: ComputerSuggestion) => {
        const confirmed = await modal.showConfirm(
            `Delete suggestion "${s.Name}"?`,
            'Delete Suggestion'
        );
        if (!confirmed) return;
        try {
            await deleteSuggestion(s.Suggestion_ID);
            await load();
        } catch (err) {
            console.error('Failed to delete suggestion:', err);
            setError('Failed to delete suggestion');
        }
    };

    if (!isOpen) return null;

    const unusedTypes = availableItemTypes.filter(t => !draft.itemTypes.includes(t));

    return (
        <div
            className="fixed inset-0 z-[70] bg-black/40 grid place-items-center p-4 content-center"
            onClick={(e) => {
                // Stop propagation so the click doesn't bubble up to the
                // parent RoomDetailModal's backdrop handler (which would close
                // the room modal too).
                e.stopPropagation();
                onClose();
            }}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Suggestions</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Suggestions are reusable presets of item types (e.g. "Standard Lab PC" =
                    Mini PC + Keyboard + Mouse + Monitor). Apply them when adding a PC to pre-fill rows.
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-400">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">Loading…</div>
                ) : (
                    <div className="space-y-3 mb-4">
                        {suggestions.length === 0 && editingId !== 'new' && (
                            <div className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                No suggestions yet. Click "+ New Suggestion" below.
                            </div>
                        )}

                        {suggestions.map((s) => {
                            const isEditing = editingId === s.Suggestion_ID;
                            return (
                                <div
                                    key={s.Suggestion_ID}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                                >
                                    {isEditing ? (
                                        <DraftEditor
                                            draft={draft}
                                            setDraft={setDraft}
                                            typeInput={typeInput}
                                            setTypeInput={setTypeInput}
                                            unusedTypes={unusedTypes}
                                            addType={addType}
                                            removeType={removeType}
                                            onSave={handleSave}
                                            onCancel={cancelEdit}
                                            isSaving={isSaving}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-gray-900 dark:text-white truncate">{s.Name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {s.Item_Types.map(formatItemType).join(', ') || '—'}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(s)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(s)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {editingId === 'new' && (
                            <div className="border border-blue-300 dark:border-blue-700 rounded-lg p-3 bg-blue-50/40 dark:bg-blue-900/10">
                                <DraftEditor
                                    draft={draft}
                                    setDraft={setDraft}
                                    typeInput={typeInput}
                                    setTypeInput={setTypeInput}
                                    unusedTypes={unusedTypes}
                                    addType={addType}
                                    removeType={removeType}
                                    onSave={handleSave}
                                    onCancel={cancelEdit}
                                    isSaving={isSaving}
                                />
                            </div>
                        )}
                    </div>
                )}

                {editingId === null && (
                    <button
                        type="button"
                        onClick={startNew}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Suggestion
                    </button>
                )}
            </div>
        </div>
    );
}

interface DraftEditorProps {
    draft: DraftSuggestion;
    setDraft: React.Dispatch<React.SetStateAction<DraftSuggestion>>;
    typeInput: string;
    setTypeInput: React.Dispatch<React.SetStateAction<string>>;
    unusedTypes: string[];
    addType: (raw: string) => void;
    removeType: (type: string) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

function DraftEditor({
    draft,
    setDraft,
    typeInput,
    setTypeInput,
    unusedTypes,
    addType,
    removeType,
    onSave,
    onCancel,
    isSaving,
}: DraftEditorProps) {
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                </label>
                <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Standard Lab PC"
                    className="w-full rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Item Types
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {draft.itemTypes.length === 0 && (
                        <span className="text-xs text-gray-400">No types added</span>
                    )}
                    {draft.itemTypes.map(t => (
                        <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                        >
                            {formatItemType(t)}
                            <button
                                type="button"
                                onClick={() => removeType(t)}
                                className="text-blue-500 hover:text-blue-800 dark:hover:text-blue-200"
                                aria-label={`Remove ${t}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        list="suggestion-types"
                        value={typeInput}
                        onChange={(e) => setTypeInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addType(typeInput);
                            }
                        }}
                        placeholder="Type or pick (e.g. SPEAKER)"
                        className="flex-1 rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="suggestion-types">
                        {unusedTypes.map(t => (
                            <option key={t} value={t}>{formatItemType(t)}</option>
                        ))}
                    </datalist>
                    <button
                        type="button"
                        onClick={() => addType(typeInput)}
                        disabled={!typeInput.trim()}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium"
                    >
                        Add
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving || !draft.name.trim() || draft.itemTypes.length === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium text-white"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    );
}
