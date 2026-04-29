import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getRooms } from '@/services/room';
import type { Room, RoomType } from '@/types/room';

interface ActiveRoomContextValue {
    rooms: Room[];
    activeRoom: Room | null;
    activeRoomId: number | null;
    setActiveRoomId: (id: number) => void;
    isLoading: boolean;
}

const ActiveRoomContext = createContext<ActiveRoomContextValue | null>(null);

const STORAGE_KEY_BASE = 'bits.scheduling.activeRoomId';

interface ActiveRoomProviderProps {
    children: ReactNode;
    allowedRoomTypes?: RoomType[];
    // Scope persistence per role so faculty / secretary / labhead don't
    // overwrite each other's last-active-room when they share a browser.
    storageScope?: string;
}

export function ActiveRoomProvider({ children, allowedRoomTypes, storageScope }: ActiveRoomProviderProps) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeRoomId, setActiveRoomIdState] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const allowedSet = useMemo(
        () => allowedRoomTypes ? new Set(allowedRoomTypes) : null,
        [allowedRoomTypes]
    );

    const storageKey = storageScope ? `${STORAGE_KEY_BASE}.${storageScope}` : STORAGE_KEY_BASE;

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        (async () => {
            try {
                const all = await getRooms();
                const bookable = all.filter(r =>
                    r.Is_Bookable !== false &&
                    (!allowedSet || allowedSet.has(r.Room_Type))
                );
                if (cancelled) return;
                setRooms(bookable);

                const stored = Number(localStorage.getItem(storageKey));
                const restored = bookable.find(r => r.Room_ID === stored);
                setActiveRoomIdState(restored ? restored.Room_ID : (bookable[0]?.Room_ID ?? null));
            } catch (err) {
                console.error('ActiveRoomProvider: failed to load rooms', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [allowedSet, storageKey]);

    const setActiveRoomId = useCallback((id: number) => {
        setActiveRoomIdState(id);
        try {
            localStorage.setItem(storageKey, String(id));
        } catch {
            // localStorage may be unavailable (private mode); the in-memory
            // value still drives the session, just no persistence.
        }
    }, [storageKey]);

    const activeRoom = useMemo(
        () => rooms.find(r => r.Room_ID === activeRoomId) ?? null,
        [rooms, activeRoomId]
    );

    const value = useMemo<ActiveRoomContextValue>(() => ({
        rooms, activeRoom, activeRoomId, setActiveRoomId, isLoading,
    }), [rooms, activeRoom, activeRoomId, setActiveRoomId, isLoading]);

    return <ActiveRoomContext.Provider value={value}>{children}</ActiveRoomContext.Provider>;
}

export function useActiveRoom(): ActiveRoomContextValue {
    const ctx = useContext(ActiveRoomContext);
    if (!ctx) throw new Error('useActiveRoom must be used within an ActiveRoomProvider');
    return ctx;
}
