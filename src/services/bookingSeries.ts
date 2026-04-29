import api from '@/services/api';

export interface BookingSeriesPayload {
    User_ID: number;
    Room_ID: number;
    Title: string;
    Purpose?: string;
    Notes?: string;
    Recurrence_Rule: string;
    Anchor_Start: string; // ISO datetime
    Anchor_End: string;   // ISO datetime
    Excluded_Dates?: string[]; // YYYY-MM-DD
}

export interface BookingSeriesResponse {
    Series_ID: number;
    Room_ID: number;
    User_ID: number;
    Title: string;
    Purpose: string | null;
    Notes: string | null;
    Recurrence_Rule: string;
    Anchor_Start: string;
    Anchor_End: string;
    Excluded_Dates: string[];
    Status: 'PENDING' | 'APPROVED';
    occurrenceCount: number;
}

export interface SeriesConflict {
    when: string;
    reason: string;
    conflictingBookingId?: number;
}

export const createBookingSeries = async (payload: BookingSeriesPayload): Promise<BookingSeriesResponse> => {
    const { data } = await api.post<BookingSeriesResponse>('/bookings/series', payload);
    return data;
};

export const deleteBookingSeries = async (seriesId: number): Promise<void> => {
    await api.delete(`/bookings/series/${seriesId}`);
};

export interface UpdateSeriesPayload {
    Title?: string;
    Purpose?: string;
    Notes?: string;
    Room_ID?: number;
    Anchor_Start?: string;
    Anchor_End?: string;
    Excluded_Dates?: string[];
}

// Update the entire series ("edit all events"). Anchor/room changes shift
// every occurrence; the backend re-validates the full set and wipes any
// per-instance overrides whose original time no longer aligns with the new rule.
export const updateBookingSeries = async (seriesId: number, payload: UpdateSeriesPayload) => {
    const { data } = await api.patch(`/bookings/series/${seriesId}`, payload);
    return data;
};

export interface SeriesDecisionPayload {
    status: 'APPROVED' | 'REJECTED';
    notes?: string;
    applyToSeries: boolean;
    Original_Start?: string; // required when applyToSeries === false
}

export interface SeriesDecisionResult {
    series?: { Series_ID: number; Status: string };
    occurrence?: { Booked_Room_ID: number; Status: string };
    approved: number | string;
    rejected: number | string;
    totalOccurrences?: number;
    conflicts?: Array<{ when: string; reason: string }>;
}

// Approve / reject a recurring series. applyToSeries=true flips the series's
// own Status and auto-rejects any occurrence that conflicts with another
// approved booking or class schedule (with a reason recorded in Notes).
// applyToSeries=false materializes a single-occurrence override carrying the
// chosen status.
export const decideSeriesStatus = async (
    seriesId: number,
    payload: SeriesDecisionPayload
): Promise<SeriesDecisionResult> => {
    const { data } = await api.post<SeriesDecisionResult>(
        `/bookings/series/${seriesId}/decision`,
        payload
    );
    return data;
};

export interface SeriesOverridePayload {
    Original_Start: string;     // ISO datetime of the occurrence being overridden
    Start_Time?: string;
    End_Time?: string;
    Room_ID?: number;
    Purpose?: string;
    Notes?: string;
    Status?: 'PENDING' | 'APPROVED' | 'CANCELLED';
}

// Edits a single occurrence of a series. Creates an override row if none
// exists; updates it if it does. Other occurrences keep following the rule.
export const upsertSeriesOverride = async (seriesId: number, payload: SeriesOverridePayload) => {
    const { data } = await api.post(`/bookings/series/${seriesId}/overrides`, payload);
    return data;
};

// Skip a single occurrence (single-instance delete). Adds the date to the
// series's Excluded_Dates list and drops any existing override for that slot.
export const excludeSeriesDate = async (seriesId: number, originalStart: string) => {
    const { data } = await api.post(`/bookings/series/${seriesId}/exclude`, {
        Original_Start: originalStart,
    });
    return data;
};
