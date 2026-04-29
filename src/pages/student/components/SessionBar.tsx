import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, DoorOpen, Power } from 'lucide-react';
import ReportIssueModal from '@/pages/student/components/ReportIssue';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useHeartbeat } from '@/context/HeartbeatContext';
import { useHeartbeatInterval } from '@/hooks/useHeartbeat';
import { endSession } from '@/services/heartbeat';
import { createTicket } from '@/services/tickets';
import { getOpenedLabs, getRooms, type OpenedLabRoom, type StudentUsageBooking } from '@/services/room';
import type { Room } from '@/types/room';

interface SessionBarProps {
  timeSlot?: string;
  onReportIssue?: (
    description: string,
    issueType: string,
    equipment: string,
    pcNumber: string,
    noRoom: boolean,
    roomId: number | null,
  ) => Promise<void>;
  onEndSession?: () => void; // optional; if not provided, SessionBar will logout by itself
  isLoading?: boolean;
}

const EQUIPMENT_LABEL: Record<string, string> = {
  monitor: 'Monitor',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  'mini-pc': 'Mini PC',
  headset: 'Headset',
};

interface StudentUsageSummary {
  roomName: string;
  startTime: string;
  endTime: string;
  openedBy?: string;
  isOpenNow: boolean;
}

const formatStudentUsageWindow = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();
  const sameDay = start.toDateString() === now.toDateString();
  const dateLabel = sameDay ? '' : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} `;

  return `${dateLabel}${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

const getNextStudentUsage = (labs: OpenedLabRoom[]): StudentUsageSummary | null => {
  const now = Date.now();
  const usageSlots = labs.flatMap((lab) =>
    (lab.Booked_Rooms || []).map((booking: StudentUsageBooking) => {
      const startsAt = new Date(booking.Start_Time).getTime();
      const endsAt = new Date(booking.End_Time).getTime();
      const openedBy = booking.User
        ? `${booking.User.First_Name} ${booking.User.Last_Name}`.trim()
        : undefined;

      return {
        roomName: lab.Name,
        startTime: booking.Start_Time,
        endTime: booking.End_Time,
        openedBy,
        isOpenNow: startsAt <= now && endsAt > now,
      };
    })
  );

  return usageSlots
    .filter((slot) => new Date(slot.endTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;
};

export default function SessionBar({
  onReportIssue,
  onEndSession,
  isLoading = false
}: SessionBarProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [studentUsage, setStudentUsage] = useState<StudentUsageSummary | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { computer, isDetecting, detectionFailed, sessionId, stopHeartbeat } = useHeartbeat();
  useHeartbeatInterval(); // Start heartbeat interval

  const pcLabel = computer?.Name || 'Unknown';
  const roomName = computer?.Room?.Name || 'Unknown Room';
  const roomId = (computer?.Room as any)?.Room_ID as number | undefined;
  const computerStatus = isDetecting
    ? 'Detecting PC...'
    : detectionFailed
      ? 'PC not detected'
      : pcLabel;

  useEffect(() => {
    let isMounted = true;

    const loadStudentUsage = async (showLoading = false) => {
      if (showLoading) setIsUsageLoading(true);

      try {
        const labs = await getOpenedLabs();
        if (isMounted) setStudentUsage(getNextStudentUsage(labs));
      } catch (error) {
        console.error('Failed to fetch student usage rooms:', error);
        if (isMounted) setStudentUsage(null);
      } finally {
        if (isMounted && showLoading) setIsUsageLoading(false);
      }
    };

    loadStudentUsage(true);
    const refreshInterval = window.setInterval(() => loadStudentUsage(false), 60000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  // Fetch the room list once for the Report Issue combobox so the student
  // can correct or change the auto-detected room.
  useEffect(() => {
    let isMounted = true;
    getRooms()
      .then((data) => {
        if (isMounted) setRooms(data);
      })
      .catch((err) => console.error('Failed to fetch rooms for report modal:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Default ticket creation for students creates a real ticket and notifies LabTechs via backend
  const handleReportIssue = async (
    description: string,
    issueType: string,
    equipment: string,
    editedPcNumber: string,
    noRoom: boolean,
    chosenRoomId: number | null,
  ) => {
    if (onReportIssue) {
      return onReportIssue(description, issueType, equipment, editedPcNumber, noRoom, chosenRoomId);
    }

    if (!user?.User_ID) return;

    const categoryMap: Record<string, 'HARDWARE' | 'SOFTWARE' | 'OTHER'> = {
      hardware: 'HARDWARE',
      software: 'SOFTWARE',
      network: 'OTHER',
      other: 'OTHER',
    };

    // Equipment + PC are folded into a single "[Equipment · PC X]" tag prefix on
    // the description so the labtech UI can render them as a small chip. Location
    // stays null — Room_ID is the structured "where", and labtechs use Location
    // only as a free-text override.
    const equipmentLabel = equipment ? EQUIPMENT_LABEL[equipment] || null : null;
    const tagParts: string[] = [];
    if (equipmentLabel) tagParts.push(equipmentLabel);
    if (editedPcNumber) tagParts.push(editedPcNumber);
    const tagPrefix = tagParts.length > 0 ? `[${tagParts.join(' · ')}] ` : '';
    const finalDescription = `${tagPrefix}${description}`;

    await createTicket({
      Reported_By_ID: user.User_ID,
      Report_Problem: finalDescription,
      Location: null,
      Room_ID: noRoom ? null : chosenRoomId ?? null,
      Category: categoryMap[issueType] ?? 'OTHER',
      Status: 'PENDING',
    });
  };

  const handleEndSessionClick = async () => {
    if (isLoading) return;

    // End session on backend and stop heartbeat
    if (sessionId) {
      try {
        await endSession(sessionId);
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
    stopHeartbeat();

    if (typeof onEndSession === 'function') {
      onEndSession();
      return;
    }
    logout();
    navigate('/login', { replace: true });
  };

  // Show computer selector if detection failed
  // if (detectionFailed) {
  //   return <ComputerSelector />;
  // }

  return (
    <div className="flex flex-col md:flex-row justify-between items-stretch gap-3 md:gap-4 bg-gray-100 dark:bg-slate-800 rounded-xl p-3 md:p-4 w-full border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg flex-shrink-0">
          <DoorOpen className="h-4 w-4 md:h-5 md:w-5 text-white" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">Student Usage</span>
            {studentUsage && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${studentUsage.isOpenNow ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                {studentUsage.isOpenNow ? 'Open now' : 'Upcoming'}
              </span>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
            {isUsageLoading ? (
              <span>Checking student usage rooms...</span>
            ) : studentUsage ? (
              <span className="truncate">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{studentUsage.roomName}</span>{' '}
                {formatStudentUsageWindow(studentUsage.startTime, studentUsage.endTime)} is open for usage
              </span>
            ) : (
              <span>No lab room is open for student usage yet.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            <span>{computerStatus}</span>
            {!isDetecting && !detectionFailed && <span>Room: {roomName}</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
        <button
          onClick={() => setIsReportModalOpen(true)}
          disabled={isLoading}
          className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-300 dark:hover:bg-slate-600 transition-all duration-200 hover:shadow-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
          <span className="whitespace-nowrap">Report Issue</span>
        </button>
        <button
          onClick={handleEndSessionClick}
          disabled={isLoading}
          className="bg-red-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-red-700 transition-all duration-200 hover:shadow-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <Power className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
          )}
          <span className="whitespace-nowrap">End Session</span>
        </button>
      </div>

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportIssue}
        room={roomName}
        pcNumber={pcLabel}
        rooms={rooms.map((r) => ({ Room_ID: r.Room_ID, Name: r.Name }))}
        defaultRoomId={roomId ?? null}
      />
    </div>
  );
}
