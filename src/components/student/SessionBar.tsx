import { useState } from 'react';
import { FiAlertTriangle, FiPower } from 'react-icons/fi';
import ReportIssueModal from './Modals/ReportIssue';

interface SessionBarProps {
  pcNumber?: string;
  timeSlot?: string;
  onReportIssue?: (title: string, description: string, issueType: string) => Promise<void>;
  onEndSession?: () => void;
  isLoading?: boolean;
}

export default function SessionBar({ 
  pcNumber = '14', 
  timeSlot = '9:00 - 10:30',
  onReportIssue = async () => {},
  onEndSession = () => {},
  isLoading = false
}: SessionBarProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 rounded-xl p-4 w-full border border-slate-700">
      {/* Left Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 p-2 rounded-lg flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="font-semibold text-gray-200 whitespace-nowrap">Active Session</span>
            <div className="hidden sm:block h-5 w-px bg-slate-600"></div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base">
              <span className="font-medium text-gray-300">PC {pcNumber}</span>
              <span className="hidden sm:inline text-gray-500">•</span>
              <span className="text-gray-400">{timeSlot}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button 
          onClick={() => setIsReportModalOpen(true)}
          disabled={isLoading}
          className="bg-slate-700 text-gray-200 px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-600 transition-all duration-200 hover:shadow-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiAlertTriangle className="h-5 w-5" />
          <span className="whitespace-nowrap">Report Issue</span>
        </button>
        <button 
          onClick={onEndSession}
          disabled={isLoading}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 hover:shadow-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <FiPower className="h-5 w-5" />
          )}
          <span className="whitespace-nowrap">End Session</span>
        </button>
      </div>

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={onReportIssue}
      />
    </div>
  );
}