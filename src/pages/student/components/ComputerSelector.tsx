import { useState, useEffect } from 'react';
import { useHeartbeat } from '@/context/HeartbeatContext';
import { getComputers } from '@/services/computers';
import type { Computer as HeartbeatComputer } from '@/types/heartbeat';
import type { Computer as ServiceComputer } from '@/services/computers';
import { getNumberedComputers } from '@/utils/computerDisplay';

export const ComputerSelector: React.FC = () => {
  const { startHeartbeat } = useHeartbeat();
  const [computers, setComputers] = useState<ServiceComputer[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const numberedComputers = getNumberedComputers(computers);

  useEffect(() => {
    const fetchComputers = async () => {
      try {
        const data = await getComputers();
        setComputers(data);
      } catch (err) {
        setError('Failed to load computers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComputers();
  }, []);

  const handleSelect = () => {
    if (!selectedId) return;

    const selection = numberedComputers.find(({ computer }) => computer.Computer_ID === parseInt(selectedId));
    if (selection) {
      const serviceComputer = selection.computer;
      // Convert ServiceComputer to HeartbeatComputer
      const heartbeatComputer: HeartbeatComputer = {
        Computer_ID: serviceComputer.Computer_ID,
        Name: selection.displayName,
        Room_ID: serviceComputer.Room_ID,
        Mac_Address: serviceComputer.Mac_Address,
        IP_Address: null, // Not available from service
        Is_Online: true, // Assume true for manual selection
        Room: serviceComputer.Room ?? undefined,
      };
      const sessionId = crypto.randomUUID?.() || `session-${Date.now()}`;
      startHeartbeat(heartbeatComputer, sessionId);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">Loading available computers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
      <div>
        <p className="text-sm font-medium text-yellow-900 mb-2">
          Auto-detection failed. Please select your computer manually:
        </p>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full p-2 border border-yellow-300 rounded-md bg-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        >
          <option value="">Select a computer...</option>
          {numberedComputers.map(({ computer, displayName, originalName, wasRenumbered }) => (
            <option key={computer.Computer_ID} value={computer.Computer_ID}>
              {displayName}{wasRenumbered ? ` (${originalName})` : ''} - {computer.Room?.Name || 'Unknown Room'}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSelect}
        disabled={!selectedId}
        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Start Session
      </button>
    </div>
  );
};
