import { useEffect, useState, useRef } from 'react';
import { getComputerHistory, type HeartbeatRecord } from '../../services/monitoring';
import Table from '../Table';
import type { HeartbeatStatus } from '../../types/heartbeat';

interface ComputerDetailModalProps {
  computerId: number;
  computerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ComputerDetailModal({
  computerId,
  computerName,
  isOpen,
  onClose
}: ComputerDetailModalProps) {
  const [history, setHistory] = useState<HeartbeatRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Status color mapping
  const statusColors: Record<HeartbeatStatus, string> = {
    ONLINE: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    IDLE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    WARNING: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
    OFFLINE: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
  };

  useEffect(() => {
    if (isOpen) {
      // Fetch history when modal opens
      setIsLoading(true);
      getComputerHistory(computerId)
        .then(data => {
          setHistory(data.heartbeats);
        })
        .catch(error => {
          console.error('Failed to fetch computer history:', error);
          setHistory([]);
        })
        .finally(() => setIsLoading(false));

      // Focus close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen, computerId]);

  // Handle Esc key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Focus trap within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [isOpen, history]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-xl font-bold dark:text-white">
            {computerName} - Session History
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No session history available.
          </div>
        ) : (
          <Table headers={['Time', 'User', 'Status', 'Session']}>
            {history.map((record) => (
              <div
                key={record.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="text-sm text-gray-900 dark:text-white">
                  {new Date(record.timestamp).toLocaleString()}
                </div>
                <div className="text-sm text-gray-900 dark:text-white">
                  {record.user
                    ? `${record.user.First_Name} ${record.user.Last_Name}`
                    : '-'}
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      statusColors[record.status as HeartbeatStatus]
                    }`}
                    aria-label={`Status: ${record.status}`}
                  >
                    <span className="size-2 rounded-full bg-current" aria-hidden="true"></span>
                    {record.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {record.session_id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
