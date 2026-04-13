import api from "@/services/api";

export type ScheduleImportRowStatus =
    | 'valid'
    | 'imported'
    | 'skipped'
    | 'invalid'
    | 'unknown_room'
    | 'ambiguous_room'
    | 'conflict'
    | 'duplicate';

export interface ScheduleImportOptions {
    sheetNames: string[];
    skipDissolved: boolean;
    approvedOnly: boolean;
    anchorDate: string;
}

export interface ScheduleImportRow {
    sheetName: string;
    rowNumber: number;
    group?: string;
    courseCode?: string;
    description?: string;
    courseStatus?: string;
    requestStatus?: string;
    population?: string;
    teacher?: string;
    department?: string;
    rawSchedule?: string;
    title?: string;
    status: ScheduleImportRowStatus;
    reason: string;
    roomCode?: string;
    roomId?: number;
    roomName?: string;
    daysValue?: string;
    startTime?: string;
    endTime?: string;
    scheduleId?: number;
}

export interface ScheduleImportSummary {
    totalRows: number;
    valid: number;
    imported: number;
    skipped: number;
    invalid: number;
    unknownRoom: number;
    ambiguousRoom: number;
    conflicts: number;
    duplicates: number;
}

export interface ScheduleImportResult {
    options: {
        sheetNames: string[];
        skipDissolved: boolean;
        approvedOnly: boolean;
        anchorDate: string;
        timezoneOffsetMinutes: number;
    };
    sheets: string[];
    rows: ScheduleImportRow[];
    summary: ScheduleImportSummary;
}

const buildPayload = (file: File, options: ScheduleImportOptions) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheets', JSON.stringify(options.sheetNames));
    formData.append('skipDissolved', String(options.skipDissolved));
    formData.append('approvedOnly', String(options.approvedOnly));
    formData.append('anchorDate', options.anchorDate);
    formData.append('timezoneOffsetMinutes', '480');
    return formData;
};

export const previewOfferedCourseImport = async (file: File, options: ScheduleImportOptions): Promise<ScheduleImportResult> => {
    const { data } = await api.post<ScheduleImportResult>(
        '/schedules/import-offered-courses/preview',
        buildPayload(file, options),
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
};

export const importOfferedCourseSchedules = async (file: File, options: ScheduleImportOptions): Promise<ScheduleImportResult> => {
    const { data } = await api.post<ScheduleImportResult>(
        '/schedules/import-offered-courses',
        buildPayload(file, options),
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
};
