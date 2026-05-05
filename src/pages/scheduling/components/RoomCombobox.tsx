import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Lock } from 'lucide-react';
import type { Room } from '@/types/room';

interface RoomComboboxProps {
    id: string;
    value: number | '';
    rooms: Room[];
    onChange: (value: number) => void;
    // When set, the combo box auto-selects this room and prevents user changes.
    // The booking flow uses this when the sidebar's room filter is narrowed to
    // a single room — that filter implicitly fixes the room context.
    lockedRoomId?: number;
    className?: string;
    placeholder?: string;
}

export default function RoomCombobox({
    id,
    value,
    rooms,
    onChange,
    lockedRoomId,
    className = '',
    placeholder = 'Select Room',
}: RoomComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const [menuRect, setMenuRect] = useState({ left: 0, top: 0, width: 0 });

    const isLocked = lockedRoomId != null;

    const visibleRooms = useMemo(() => {
        if (isLocked) {
            const locked = rooms.find(r => r.Room_ID === lockedRoomId);
            return locked ? [locked] : [];
        }
        return rooms;
    }, [rooms, isLocked, lockedRoomId]);

    useEffect(() => {
        if (isLocked && lockedRoomId != null && value !== lockedRoomId) {
            onChange(lockedRoomId);
        }
    }, [isLocked, lockedRoomId, value, onChange]);

    const selectedRoom = rooms.find(r => r.Room_ID === value);

    const filteredRooms = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return visibleRooms;
        return visibleRooms.filter(r =>
            r.Name.toLowerCase().includes(q) ||
            r.Room_Type.toLowerCase().includes(q)
        );
    }, [visibleRooms, query]);

    const updateMenuRect = () => {
        const rect = inputRef.current?.getBoundingClientRect();
        if (!rect) return;
        setMenuRect({ left: rect.left, top: rect.bottom + 8, width: rect.width });
    };

    useEffect(() => {
        if (!isOpen) return;
        updateMenuRect();
        const selectedIdx = filteredRooms.findIndex(r => r.Room_ID === value);
        setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                !wrapperRef.current?.contains(target) &&
                !menuRef.current?.contains(target)
            ) {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updateMenuRect);
        window.addEventListener('scroll', updateMenuRect, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateMenuRect);
            window.removeEventListener('scroll', updateMenuRect, true);
        };
    }, [isOpen, filteredRooms, value]);

    useEffect(() => {
        if (!isOpen) return;
        optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, isOpen]);

    const chooseRoom = (room: Room) => {
        onChange(room.Room_ID);
        setIsOpen(false);
        setQuery('');
        inputRef.current?.focus();
    };

    const moveActive = (direction: 1 | -1) => {
        if (filteredRooms.length === 0) return;
        setActiveIndex(prev => (prev + direction + filteredRooms.length) % filteredRooms.length);
    };

    const displayValue = isOpen ? query : (selectedRoom?.Name || '');

    const handleFocus = () => {
        if (isLocked) return;
        updateMenuRect();
        setIsOpen(true);
        setQuery('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
            setQuery('');
            return;
        }
        if (isLocked) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!isOpen) { updateMenuRect(); setIsOpen(true); return; }
            moveActive(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) { updateMenuRect(); setIsOpen(true); return; }
            moveActive(-1);
        } else if (event.key === 'Enter' && isOpen && filteredRooms[activeIndex]) {
            event.preventDefault();
            chooseRoom(filteredRooms[activeIndex]);
        }
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <input
                ref={inputRef}
                id={id}
                type="text"
                value={displayValue}
                onChange={(event) => {
                    if (isLocked) return;
                    setQuery(event.target.value);
                    setIsOpen(true);
                    updateMenuRect();
                }}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                readOnly={isLocked}
                placeholder={placeholder}
                autoComplete="off"
                role="combobox"
                aria-expanded={isOpen}
                aria-controls={`${id}-menu`}
                aria-readonly={isLocked}
                aria-activedescendant={isOpen && filteredRooms[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#615fff] dark:focus:ring-[#615fff]/20 ${isLocked ? 'cursor-not-allowed bg-slate-100 dark:bg-white/[0.06]' : 'hover:border-slate-300 hover:bg-white dark:hover:border-[#475569]'}`}
            />
            {isLocked ? (
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-label="Room locked by filter" />
            ) : (
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    id={`${id}-menu`}
                    data-floating-dropdown="true"
                    className="fixed z-[1200] max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-xl shadow-slate-950/10 scrollbar-thin dark:border-[#334155] dark:bg-[#1e2939] dark:shadow-black/30"
                    style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
                    role="listbox"
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    {filteredRooms.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                            {query.trim() ? `No rooms match "${query}"` : 'No rooms available'}
                        </div>
                    ) : filteredRooms.map((room, index) => {
                        const selected = room.Room_ID === value;
                        const active = index === activeIndex;
                        return (
                            <button
                                ref={(node) => { optionRefs.current[index] = node; }}
                                id={`${id}-option-${index}`}
                                key={room.Room_ID}
                                type="button"
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => chooseRoom(room)}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selected
                                    ? 'bg-white font-semibold text-slate-950 dark:bg-white/10 dark:text-white'
                                    : active
                                        ? 'bg-white text-slate-950 dark:bg-white/[0.07] dark:text-white'
                                        : 'text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
                                    }`}
                                role="option"
                                aria-selected={selected}
                            >
                                <span className="truncate">{room.Name}</span>
                                {selected && <Check className="h-4 w-4 shrink-0 text-indigo-500 dark:text-cyan-300" />}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}
