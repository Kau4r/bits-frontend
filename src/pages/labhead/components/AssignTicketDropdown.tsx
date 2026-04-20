import { useState, useEffect, useRef } from 'react';
import { fetchUsersByRole } from '@/services/user';
import { assignTicket } from '@/services/tickets';
import type { User } from '@/types/user';

interface AssignTicketDropdownProps {
    ticketId: number;
    currentTechnicianId?: number | null;
    onAssigned: (technicianId: number, technicianName: string) => void;
    buttonLabel?: string;
}

export default function AssignTicketDropdown({
    ticketId,
    currentTechnicianId,
    onAssigned,
    buttonLabel,
}: AssignTicketDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [techs, setTechs] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load active technicians when dropdown opens
    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setIsLoading(true);
            try {
                const users = await fetchUsersByRole('LAB_TECH');
                // Only show active technicians, exclude the current one
                setTechs(users.filter(u => u.Is_Active && u.User_ID !== currentTechnicianId));
            } catch (err) {
                console.error('Failed to fetch technicians:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [isOpen, currentTechnicianId]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleAssign = async (tech: User) => {
        setAssigning(true);
        setAssignError(null);
        try {
            await assignTicket(ticketId, tech.User_ID);
            onAssigned(tech.User_ID, `${tech.First_Name} ${tech.Last_Name}`);
            setIsOpen(false);
        } catch (err) {
            console.error('Failed to assign ticket:', err);
            setAssignError(err instanceof Error ? err.message : 'Failed to assign ticket');
        } finally {
            setAssigning(false);
        }
    };

    const label = buttonLabel || (currentTechnicianId ? 'Reassign' : 'Assign');

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={assigning}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${currentTechnicianId
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:border-amber-800'
                        : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 dark:text-indigo-300 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 dark:border-indigo-800'
                    }`}
            >
                {assigning ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                )}
                {label}
                <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-[#334155] dark:bg-[#1e2939]">
                    <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 dark:border-[#334155] dark:bg-[#1e2939] dark:text-gray-400">
                        Select Technician
                    </div>
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 dark:border-indigo-400" />
                        </div>
                    ) : assignError ? (
                        <div className="px-3 py-3 text-xs text-red-600 dark:text-red-300 text-center">
                            {assignError}
                        </div>
                    ) : techs.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                            No available technicians
                        </div>
                    ) : (
                        <div className="max-h-48 overflow-y-auto">
                            {techs.map((tech) => (
                                <button
                                    key={tech.User_ID}
                                    type="button"
                                    onClick={() => handleAssign(tech)}
                                    disabled={assigning}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                                        {tech.First_Name.charAt(0)}
                                    </span>
                                    <span className="truncate">{tech.First_Name} {tech.Last_Name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
