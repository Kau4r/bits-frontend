import { useState } from 'react';
import { FiAlertTriangle, FiPower } from 'react-icons/fi';
import ReportIssueModal from './Modals/ReportIssue';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useHeartbeat } from '@/context/HeartbeatContext';
import { useHeartbeatInterval } from '@/hooks/useHeartbeat';
import { ComputerSelector } from './ComputerSelector';
import { endSession } from '@/services/heartbeat';
import { createTicket } from '@/services/tickets';

interface SessionBarProps {
  timeSlot?: string;
  onReportIssue?: (description: string, issueType: string, equipment: string, pcNumber: string) => Promise<void>;
  onEndSession?: () => void; // optional; if not provided, SessionBar will logout by itself
  isLoading?: boolean;
}

export default function SessionBar({
  timeSlot = '9:00 - 10:30',
  onReportIssue,
  onEndSession,
  isLoading = false
}: SessionBarProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { computer, isDetecting, detectionFailed, sessionId, stopHeartbeat } = useHeartbeat();
  useHeartbeatInterval(); // Start heartbeat interval

  const pcNumber = computer?.Name || 'Unknown';
  const roomName = computer?.Room?.Name || 'Unknown Room';
  const roomId = (computer?.Room as any)?.Room_ID as number | undefined;

  // Default ticket creation for students — creates a real ticket and notifies LabTechs via backend
  const handleReportIssue = async (description: string, issueType: string, equipment: string, editedPcNumber: string) => {
    if (onReportIssue) {
      return onReportIssue(description, issueType, equipment, editedPcNumber);
    }

    if (!user?.User_ID) return;

    const categoryMap: Record<string, 'HARDWARE' | 'SOFTWARE' | 'FACILITY' | 'OTHER'> = {
      hardware: 'HARDWARE',
      software: 'SOFTWARE',
      network: 'FACILITY',
      other: 'OTHER',
    };

    await createTicket({
      Reported_By_ID: user.User_ID,
      Report_Problem: description,
      Location: `${equipment} — PC: ${editedPcNumber} | Room: ${roomName}`,
      Room_ID: roomId,
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

  // Show loading state during detection
  if (isDetecting) {
    return (
      <div className="flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-xl p-4 w-full border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-300">Detecting computer...</p>
        </div>
      </div>
    );
  }

  // Show computer selector if detection failed
  // if (detectionFailed) {
  //   return <ComputerSelector />;
  // }

  return (
    <div className="flex flex-col md:flex-row justify-between items-stretch gap-3 md:gap-4 bg-gray-100 dark:bg-slate-800 rounded-xl p-3 md:p-4 w-full border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="bg-green-500 p-1.5 md:p-2 rounded-lg flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
          <span className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">Active Session</span>
          <div className="hidden sm:block h-5 w-px bg-gray-300 dark:bg-slate-600"></div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">PC {pcNumber}</span>
            <span className="text-gray-500 hidden sm:inline">•</span>
            <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap truncate">{timeSlot}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
        <button
          onClick={() => setIsReportModalOpen(true)}
          disabled={isLoading}
          className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-300 dark:hover:bg-slate-600 transition-all duration-200 hover:shadow-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiAlertTriangle className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
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
            <FiPower className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
          )}
          <span className="whitespace-nowrap">End Session</span>
        </button>
      </div>

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportIssue}
        room={roomName}
        pcNumber={pcNumber}
      />
    </div>
  );
}