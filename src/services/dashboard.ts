import api from './api';

export interface DashboardMetrics {
    role: string;
    counts: {
        pendingTickets?: number;
        activeBookings?: number;
        brokenItems?: number;
        pendingForms?: number;
        approvedForms?: number;
        inReviewForms?: number;
        myAssignedTickets?: number;
        activeMaintenance?: number;
        activeBorrowings?: number;
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
