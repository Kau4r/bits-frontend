import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchUsersByRole } from '@/services/user';
import { assignTicket } from '@/services/tickets';
import type { User } from '@/types/user';

interface AssignTicketDropdownProps {
    ticketId: number;
    currentTechnicianId?: number | null;
    onAssigned: (technicianId: number, technicianName: string) => void;
    buttonLabel?: string;
}

const MENU_WIDTH = 224;
const MENU_GUTTER = 8;
const MENU_MAX_HEIGHT = 256;

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
    const [activeIndex, setActiveIndex] = useState(-1);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState<{ left: number; top?: number; bottom?: number; flipped: boolean }>({ left: 0, top: 0, flipped: false });

    const updateMenuPos = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const flipped = spaceBelow < MENU_MAX_HEIGHT + MENU_GUTTER && spaceAbove > spaceBelow;
        const left = Math.max(
            MENU_GUTTER,
            Math.min(window.innerWidth - MENU_WIDTH - MENU_GUTTER, rect.right - MENU_WIDTH),
        );
        if (flipped) {
            setMenuPos({ left, bottom: window.innerHeight - rect.top + MENU_GUTTER, flipped: true });
        } else {
            setMenuPos({ left, top: rect.bottom + MENU_GUTTER, flipped: false });
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setIsLoading(true);
            try {
                const users = await fetchUsersByRole('LAB_TECH');
                setTechs(users.filter(u => u.Is_Active && u.User_ID !== currentTechnicianId));
            } catch (err) {
                console.error('Failed to fetch technicians:', err);
                setAssignError('Failed to load technicians');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [isOpen, currentTechnicianId]);

    useEffect(() => {
        if (!isOpen) {
            setActiveIndex(-1);
            return;
        }

        updateMenuPos();

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                menuRef.current && !menuRef.current.contains(target) &&
                buttonRef.current && !buttonRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        window.addEventListener('resize', updateMenuPos);
        window.addEventListener('scroll', updateMenuPos, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
            window.removeEventListener('resize', updateMenuPos);
            window.removeEventListener('scroll', updateMenuPos, true);
        };
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

    const handleListKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (techs.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => (i + 1) % techs.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => (i <= 0 ? techs.length - 1 : i - 1));
        } else if ((e.key === 'Enter' || e.key === ' ') && activeIndex >= 0) {
            e.preventDefault();
            handleAssign(techs[activeIndex]);
        }
    };

    const label = buttonLabel || (currentTechnicianId ? 'Reassign' : 'Assign');
    const isReassign = !!currentTechnicianId;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(o => !o)}
                disabled={assigning}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${isReassign
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30'
                    }`}
            >
                {assigning ? (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                )}
                {label}
                <svg className={`h-3 w-3 transition-transform ${isOpen ? (menuPos.flipped ? 'rotate-0' : 'rotate-180') : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    role="listbox"
                    tabIndex={-1}
                    onKeyDown={handleListKey}
                    style={{
                        position: 'fixed',
                        left: menuPos.left,
                        ...(menuPos.flipped
                            ? { bottom: menuPos.bottom }
                            : { top: menuPos.top }),
                        width: MENU_WIDTH,
                        maxHeight: MENU_MAX_HEIGHT,
                    }}
                    className="z-[1200] flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl shadow-slate-950/10 dark:border-[#334155] dark:bg-[#1e2939] dark:shadow-black/30"
                >
                    <div className="shrink-0 border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 dark:border-[#334155] dark:bg-white/[0.03] dark:text-gray-400">
                        Select Technician
                    </div>
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600 dark:border-indigo-400" />
                        </div>
                    ) : assignError ? (
                        <div className="px-3 py-3 text-center text-xs text-red-600 dark:text-red-300">
                            {assignError}
                        </div>
                    ) : techs.length === 0 ? (
                        <div className="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                            No available technicians
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto py-1">
                            {techs.map((tech, idx) => {
                                const active = idx === activeIndex;
                                return (
                                    <button
                                        key={tech.User_ID}
                                        type="button"
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        onClick={() => handleAssign(tech)}
                                        disabled={assigning}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${active
                                            ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-white'
                                            : 'text-gray-700 hover:bg-indigo-50 dark:text-gray-200 dark:hover:bg-indigo-900/20'
                                            }`}
                                        role="option"
                                        aria-selected={active}
                                    >
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                            {tech.First_Name.charAt(0)}
                                        </span>
                                        <span className="truncate">{tech.First_Name} {tech.Last_Name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>,
                document.body,
            )}
        </>
    );
}
