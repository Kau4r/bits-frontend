export interface Semester {
  Semester_ID: number;
  Name: string;
  Start_Date: string;
  End_Date: string;
  Is_Active: boolean;
  Created_At: string;
  Updated_At: string;
}

export interface SemesterSummary {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface RoomAuditStatus {
  roomId: number;
  totalItems: number;
  checkedItems: number;
  allChecked: boolean;
  semester: SemesterSummary | null;
  lastCheckedAt: string | null;
}
