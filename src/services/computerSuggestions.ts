import api from '@/services/api';
import toast from 'react-hot-toast';

export interface ComputerSuggestion {
    Suggestion_ID: number;
    Name: string;
    Item_Types: string[];
    Created_At: string;
    Updated_At: string;
}

export interface SuggestionInput {
    name: string;
    itemTypes: string[];
}

const SILENT = { silent: true } as Parameters<typeof api.get>[1];

export const fetchSuggestions = async (): Promise<ComputerSuggestion[]> => {
    // Silent: this is a background fetch on modal open. Failures (e.g. before
    // the prisma migration is applied) shouldn't toast — caller logs to console.
    const { data } = await api.get<ComputerSuggestion[]>('/computer-suggestions', SILENT);
    return data;
};

export const createSuggestion = async (data: SuggestionInput): Promise<ComputerSuggestion> => {
    const response = await api.post<ComputerSuggestion>('/computer-suggestions', data);
    toast.success('Suggestion saved');
    return response.data;
};

export const updateSuggestion = async (id: number, data: Partial<SuggestionInput>): Promise<ComputerSuggestion> => {
    const response = await api.put<ComputerSuggestion>(`/computer-suggestions/${id}`, data);
    toast.success('Suggestion updated');
    return response.data;
};

export const deleteSuggestion = async (id: number): Promise<void> => {
    await api.delete(`/computer-suggestions/${id}`);
    toast.success('Suggestion deleted');
};
