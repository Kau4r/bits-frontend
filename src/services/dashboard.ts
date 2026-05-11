import api from '@/services/api';

export interface DashboardMetrics {
    role: string;
    counts: {
        pendingTickets?: number;
        completedTickets?: number;
        inProgressTickets?: number;
        unassignedTickets?: number;
        activeBookings?: number;
        pendingBookings?: number;
        rejectedBookings?: number;
        totalItems?: number;
        brokenItems?: number;
        availableItems?: number;
        borrowedItems?: number;
        disposedItems?: number;
        roomsInMaintenance?: number;
        pendingForms?: number;
        approvedForms?: number;
        inReviewForms?: number;
        completedForms?: number;
        cancelledForms?: number;
        submittedReports?: number;
        myAssignedTickets?: number;
        myCompletedTickets?: number;
        activeMaintenance?: number;
        activeBorrowings?: number;
        defectiveItems?: number;
        draftReports?: number;
    };
    distributions?: {
        itemTypes?: Record<string, number>;
        itemStatuses?: Record<string, number>;
        bookingStatuses?: Record<string, number>;
    };
    summaries?: {
        bookings?: Record<string, number>;
        tickets?: Record<string, number>;
        forms?: Record<string, number>;
        inventory?: Record<string, number>;
        rooms?: Record<string, number>;
        reports?: Record<string, number>;
    };
    recentActivity: Array<{
        Log_ID: number;
        Action: string;
        Details: string;
        Timestamp: string;
        User?: {
            First_Name: string;
            Last_Name: string;
        };
    }>;
}

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
    const { data } = await api.get<DashboardMetrics>('/dashboard');
    return data;
};

export interface LeaderboardEntry {
    User_ID: number;
    Name: string;
    User_Role: 'LAB_TECH' | 'LAB_HEAD';
    borrowings: number;
    bookings: number;
    tickets: number;
    total: number;
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    range: { from: string | null; to: string | null };
}

export const getLabTechLeaderboard = async (params?: {
    from?: string;
    to?: string;
}): Promise<LeaderboardResponse> => {
    const { data } = await api.get<LeaderboardResponse>('/dashboard/leaderboard', { params });
    return data;
};
