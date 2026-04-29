import { getRooms } from "@/services/room";
import type { Room, RoomType } from '@/types/room';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { CalendarApi, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import ReportIssueModal from '@/pages/student/components/ReportIssue';
import { getBookings, createBooking, updateBooking, updateBookingStatus } from "@/services/booking";
import { getBorrowings } from "@/services/borrowing";
import type { Booking } from '@/types/booking';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import CalendarSidebar from '@/components/CalendarSidebar';
import BookingPopover from '@/components/BookingPopover';
import WarningModal from '@/pages/scheduling/components/WarningModal';
import ConfirmModal from '@/pages/scheduling/components/ConfirmModal';
import { useBookingEvents } from '@/hooks/useBookingEvents';
import type { BorrowingRequest } from '@/components/RequestCard';
import type { RecurrenceConfig } from '@/components/RecurrenceModal';
import { createBookingSeries, upsertSeriesOverride, excludeSeriesDate, updateBookingSeries, deleteBookingSeries, decideSeriesStatus } from '@/services/bookingSeries';

interface SchedulingProps {
  allowedRoomTypes?: RoomType[];
  showRejectedMyBookings?: boolean;
}

export default function Scheduling({ allowedRoomTypes, showRejectedMyBookings = false }: SchedulingProps = {}) {
  const { user } = useAuth();
  const modal = useModal();
  const currentUserId = user?.User_ID ?? 0;
  const userRole = user?.User_Role.toUpperCase() ?? 'FACULTY';
  // Scheduling is owned by SECRETARY (CONF/CONS) and LAB_HEAD/LAB_TECH (LAB/LECTURE).
  // ADMIN is intentionally not part of the scheduling workflow — they can view but
  // cannot edit other users' bookings here. Lab heads approve/reject without editing.
  const canManageAllBookings = false;
  const allowedRoomTypeSet = useMemo(
    () => allowedRoomTypes ? new Set(allowedRoomTypes) : null,
    [allowedRoomTypes]
  );
  type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

  const calendarRef = useRef<FullCalendar | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarViewType>('timeGridWeek');
  const [currentDate, setCurrentDate] = useState(dayjs().format('MMMM YYYY'));
  const [events, setEvents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);

  // Borrowing requests state (for faculty users)
  const [borrowingRequests, setBorrowingRequests] = useState<BorrowingRequest[]>([]);

  // Popover state
  const [showPopover, setShowPopover] = useState(false);
  // Holds the per-occurrence conflicts the backend returns when a recurring
  // series clashes with existing schedules/bookings. Surfaced in the
  // recurrence modal's right pane so the user can resolve them inline.
  const [seriesConflicts, setSeriesConflicts] = useState<Array<{ when: string; reason: string }> | null>(null);
  const [, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [popoverTimes, setPopoverTimes] = useState({ start: new Date(), end: new Date() });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<{
    id: string;
    title: string;
    description: string;
    roomId: number;
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
    createdBy: string;
    createdById: number;
    status: string;
    seriesId?: number | null;
    originalStart?: string | null;
    isVirtual?: boolean;
    isRecurring?: boolean;
  } | null>(null);
  const [canEditBooking, setCanEditBooking] = useState(false);

  // Tooltip state for hover preview
  const [tooltipInfo, setTooltipInfo] = useState<{
    visible: boolean;
    x: number;
    y: number;
    title: string;
    roomName: string;
    time: string;
    createdBy: string;
    status: string;
  }>({ visible: false, x: 0, y: 0, title: '', roomName: '', time: '', createdBy: '', status: '' });

  // Warning modal state
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'info';
  }>({ isOpen: false, title: '', message: '', type: 'warning' });

  // Confirm modal state for drag reschedule
  const [pendingDrag, setPendingDrag] = useState<{
    event: any;
    revert: () => void;
    oldStart: Date;
    oldEnd: Date;
    newStart: Date;
    newEnd: Date;
  } | null>(null);

  // Helper to check if a time range overlaps with existing events
  const checkOverlap = (start: Date, end: Date, roomId: number, excludeEventId?: string) => {
    return events.find(e => {
      if (excludeEventId && e.id === excludeEventId) return false;
      if (e.extendedProps.roomId !== roomId) return false;
      if (!['APPROVED', 'PENDING'].includes(e.extendedProps.status?.toUpperCase())) return false;

      const eventStart = new Date(e.start);
      const eventEnd = new Date(e.end);
      return start < eventEnd && end > eventStart;
    });
  };

  const loadBookings = useCallback(async () => {
    try {
      const bookings = await getBookings();
      const mapped = bookings
        .filter((b: Booking) => b.Status !== 'CANCELLED')
        .map((b: Booking) => ({
          id: String(b.Booked_Room_ID),
          title: b.Purpose ?? b.Series_Title ?? 'No Title',
          start: b.Start_Time,
          end: b.End_Time,
          extendedProps: {
            roomId: b.Room_ID,
            roomName: b.Room?.Name ?? 'Unknown',
            status: b.Status?.toUpperCase() || 'PENDING',
            createdBy: b.User ? `${b.User.First_Name || ''} ${b.User.Last_Name || ''}`.trim() : 'Unknown',
            createdById: b.User_ID,
            description: b.Notes ?? '',
            seriesId: b.Series_ID ?? null,
            originalStart: b.Original_Start ?? (b.Is_Virtual ? b.Start_Time : null),
            isVirtual: !!b.Is_Virtual,
            isRecurring: b.Series_ID != null,
          },
        }));
      setEvents(mapped);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  }, [currentUserId]);

  // Subscribe to real-time booking events
  useBookingEvents(useCallback((event) => {
    console.log('[Scheduling] Received real-time booking event:', event.type);
    // Reload bookings when any booking event is received
    loadBookings();
  }, [loadBookings]));

  // Load borrowing requests from API for faculty users
  const loadBorrowingRequests = async () => {
    try {
      const data = await getBorrowings({ role: 'borrower' });
      // Transform API response to BorrowingRequest format
      const mapped: BorrowingRequest[] = data.map((b: any) => ({
        id: b.Borrow_Item_ID,
        item: {
          Item_ID: b.Item?.Item_ID || 0,
          Item_Type: b.Item?.Item_Type || 'Unknown',
          Brand: b.Item?.Brand || 'Unknown',
          Serial_Number: b.Item?.Serial_Number || '',
        },
        borrower: {
          User_ID: b.Borrower?.User_ID || 0,
          First_Name: b.Borrower?.First_Name || '',
          Last_Name: b.Borrower?.Last_Name || '',
        },
        borrowDate: b.Borrow_Date,
        returnDate: b.Return_Date,
        purpose: b.Purpose || '',
        status: b.Status,
        createdAt: b.Created_At,
      }));
      setBorrowingRequests(mapped);
    } catch (error) {
      console.error('Failed to load borrowing requests:', error);
    }
  };

  // Load rooms and bookings
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Only show rooms an admin has flagged as bookable. Storage rooms,
        // control rooms, dept office, faculty office, green room, etc are
        // hidden from the scheduling/booking flow.
        const allRooms = (await getRooms()).filter(r => r.Is_Bookable !== false);
        if (allRooms.length > 0) {
          setSelectedRooms([allRooms[0].Room_ID]); // Default to just the first bookable room
        } else {
          setSelectedRooms([]);
        }
        setRooms(allRooms);
        await loadBookings();

        // Load borrowing requests for faculty users
        if (userRole === 'FACULTY') {
          await loadBorrowingRequests();
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadInitialData();
  }, [userRole, currentUserId, loadBookings]);

  const updateCurrentDate = () => {
    const api: CalendarApi | undefined = calendarRef.current?.getApi();
    const date = api?.getDate();
    if (date) setCurrentDate(dayjs(date).format('MMMM YYYY'));
  };

  const goToToday = () => {
    calendarRef.current?.getApi()?.today();
    setSelectedDate(new Date());
    updateCurrentDate();
  };

  const goToPrev = () => {
    calendarRef.current?.getApi()?.prev();
    updateCurrentDate();
  };

  const goToNext = () => {
    calendarRef.current?.getApi()?.next();
    updateCurrentDate();
  };

  const handleRoomToggle = (roomId: number) => {
    setSelectedRooms(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      }
      return [...prev, roomId];
    });
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    calendarRef.current?.getApi()?.unselect();

    if (bookableRooms.length === 0) {
      setWarningModal({
        isOpen: true,
        title: 'No Rooms Available',
        message: noRoomsMessage,
        type: 'info',
      });
      return;
    }

    // Only pre-check conflicts when a single room is focused.
    if (selectedRooms.length === 1) {
      const overlap = checkOverlap(selectInfo.start, selectInfo.end, selectedRooms[0]);
      if (overlap) {
        setWarningModal({
          isOpen: true,
          title: 'Time Slot Unavailable',
          message: `This time slot is already ${overlap.extendedProps.status === 'PENDING' ? 'pending approval' : 'booked'} by ${overlap.extendedProps.createdBy || 'someone else'}.\n\nBooking: "${overlap.title}"\nTime: ${dayjs(overlap.start).format('h:mm A')} - ${dayjs(overlap.end).format('h:mm A')}`,
          type: 'warning',
        });
        return; // Don't open popover
      }
    }

    // Get the click position for popover - use RIGHT edge so popover appears beside cell
    // Pass full rect for precise positioning (AnchorRect support)
    const rect = (selectInfo.jsEvent?.target as HTMLElement)?.getBoundingClientRect();
    if (rect) {
      setPopoverPosition({
        x: rect.right,
        y: rect.top,
        rect: {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        }
      } as any);
    } else {
      setPopoverPosition({ x: 500, y: 200 } as any);
    }
    setPopoverTimes({
      start: selectInfo.start,
      end: selectInfo.end,
    });
    setViewingBooking(null);
    setCanEditBooking(false);
    setShowPopover(true);
  };

  const handleSidebarDateSelect = (date: Date) => {
    setSelectedDate(date);
    calendarRef.current?.getApi()?.gotoDate(date);
    updateCurrentDate();
  };

  const handleCreateClick = () => {
    if (bookableRooms.length === 0) {
      setWarningModal({
        isOpen: true,
        title: 'No Rooms Available',
        message: noRoomsMessage,
        type: 'info',
      });
      return;
    }

    // Open popover with default times
    const now = new Date();
    const start = new Date(now.setMinutes(0, 0, 0));
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    // Fake centered rect for Create button
    const cx = 256 + (window.innerWidth - 256) / 2;
    const cy = 150;
    setPopoverPosition({
      x: cx,
      y: cy,
      rect: { left: cx, right: cx, top: cy, bottom: cy, width: 0, height: 0 }
    } as any);
    setPopoverTimes({ start, end });
    setShowPopover(true);
  };

  const handlePopoverSave = async (data: {
    title: string;
    description: string;
    roomId: number;
    date: string;
    startTime: string;
    endTime: string;
    repeat: boolean;
    recurrence?: { rrule: string; config: RecurrenceConfig };
  }) => {
    setIsSubmitting(true);
    try {
      const anchorStart = new Date(`${data.date}T${data.startTime}:00`);
      const anchorEnd = new Date(`${data.date}T${data.endTime}:00`);
      const durationMs = anchorEnd.getTime() - anchorStart.getTime();

      // Recurrence path: persist a single Booking_Series row on the backend.
      // The backend expands the RRULE virtually on read, so individual
      // occurrences appear on the calendar without bloating the bookings table.
      if (data.recurrence) {
        try {
          const series = await createBookingSeries({
            User_ID: currentUserId,
            Room_ID: data.roomId,
            Title: data.title,
            Purpose: data.title,
            Notes: data.description,
            Recurrence_Rule: data.recurrence.rrule,
            Anchor_Start: anchorStart.toISOString(),
            Anchor_End: anchorEnd.toISOString(),
            Excluded_Dates: data.recurrence.config.excludedDates,
          });

          setSeriesConflicts(null);
          await loadBookings();
          setShowPopover(false);
          await modal.showSuccess(
            `Created a recurring series with ${series.occurrenceCount} occurrences.`,
            series.Status === 'APPROVED' ? 'Series scheduled' : 'Series request submitted'
          );
        } catch (error: any) {
          const status = error.response?.status;
          const body = error.response?.data;
          if (status === 409 && Array.isArray(body?.conflicts)) {
            // Hand the per-occurrence reasons to the popover, which auto-opens
            // the recurrence modal with a fixable conflicts panel. Don't close
            // the popover — the user is mid-edit.
            setSeriesConflicts(body.conflicts);
          } else {
            setSeriesConflicts(null);
            await modal.showError(
              body?.details || body?.error || 'Failed to create recurring series.',
              'Series failed'
            );
          }
        }
        return;
      }

      const newBooking = await createBooking({
        User_ID: currentUserId,
        Room_ID: data.roomId,
        Start_Time: anchorStart.toISOString(),
        End_Time: anchorEnd.toISOString(),
        Purpose: data.title,
      });

      const room = rooms.find(r => r.Room_ID === data.roomId);
      setEvents(prev => [...prev, {
        id: String(newBooking.Booked_Room_ID),
        title: newBooking.Purpose ?? 'No Title',
        start: newBooking.Start_Time,
        end: newBooking.End_Time,
        extendedProps: {
          roomId: newBooking.Room_ID,
          roomName: room?.Name || 'Unknown',
          status: newBooking.Status,
          createdBy: user ? `${user.First_Name} ${user.Last_Name}` : 'Unknown',
          createdById: currentUserId,
          description: data.description,
        },
      }]);

      setShowPopover(false);
    } catch (error: any) {
      console.error('Failed to create booking:', error);

      // Show user-friendly conflict error
      if (error.response?.status === 409) {
        const conflict = error.response?.data?.conflictingBooking;
        const bookedBy = conflict?.bookedBy || 'someone else';
        const statusText = conflict?.status === 'PENDING' ? 'pending approval' : 'already booked';
        await modal.showError(`This slot is ${statusText} by ${bookedBy}.\n\nPlease choose a different time.`, 'Time Conflict');
      } else {
        await modal.showError('Failed to create booking. Please try again.', 'Error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const { event, revert, oldEvent } = dropInfo;

    // Only allow owner or admin to reschedule
    if (event.extendedProps.createdById !== currentUserId && !canManageAllBookings) {
      setWarningModal({
        isOpen: true,
        title: 'Permission Denied',
        message: 'You can only reschedule your own bookings unless you are a Lab Head or Admin.',
        type: 'error',
      });
      revert();
      return;
    }

    const newStart = event.start;
    const newEnd = event.end;
    const oldStart = oldEvent.start;
    const oldEnd = oldEvent.end;

    if (!newStart || !newEnd || !oldStart || !oldEnd) {
      revert();
      return;
    }

    // Frontend check for overlap before showing confirm modal
    const overlap = checkOverlap(newStart, newEnd, event.extendedProps.roomId, event.id);
    if (overlap) {
      setWarningModal({
        isOpen: true,
        title: 'Time Slot Unavailable',
        message: `Cannot move here - this slot is already ${overlap.extendedProps.status === 'PENDING' ? 'pending approval' : 'booked'} by ${overlap.extendedProps.createdBy || 'someone else'}.\n\nBooking: "${overlap.title}"`,
        type: 'warning',
      });
      revert();
      return;
    }

    // Store pending drag and show confirmation modal
    setPendingDrag({
      event,
      revert,
      oldStart,
      oldEnd,
      newStart,
      newEnd,
    });
  };

  // Confirm drag reschedule
  const handleConfirmDrag = async () => {
    if (!pendingDrag) return;

    const { event, newStart, newEnd, revert } = pendingDrag;
    setIsSubmitting(true);

    try {
      const seriesId = event.extendedProps.seriesId as number | null;
      const originalStart = event.extendedProps.originalStart as string | null;

      if (seriesId && originalStart) {
        // Dragging an instance of a recurring series → override that occurrence.
        await upsertSeriesOverride(seriesId, {
          Original_Start: originalStart,
          Start_Time: newStart.toISOString(),
          End_Time: newEnd.toISOString(),
        });
        await loadBookings();
        setPendingDrag(null);
        return;
      }

      await updateBooking(parseInt(event.id), {
        Start_Time: newStart.toISOString(),
        End_Time: newEnd.toISOString(),
      });

      setEvents(prev => prev.map(e =>
        e.id === event.id
          ? { ...e, start: newStart.toISOString(), end: newEnd.toISOString() }
          : e
      ));
      setPendingDrag(null);
    } catch (error: any) {
      revert();
      setPendingDrag(null);

      if (error.response?.status === 409) {
        const conflict = error.response?.data?.conflictingBooking;
        const bookedBy = conflict?.bookedBy || 'someone else';
        setWarningModal({
          isOpen: true,
          title: 'Time Slot Unavailable',
          message: `This slot is already ${conflict?.status === 'PENDING' ? 'pending approval' : 'booked'} by ${bookedBy}.\n\nPlease choose a different time.`,
          type: 'warning',
        });
      } else {
        setWarningModal({
          isOpen: true,
          title: 'Error',
          message: 'Failed to reschedule booking. Please try again.',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel drag reschedule
  const handleCancelDrag = () => {
    if (pendingDrag) {
      pendingDrag.revert();
      setPendingDrag(null);
    }
  };

  // Handle clicking on an existing event
  const handleEventClick = (clickInfo: { event: any; jsEvent: MouseEvent }) => {
    const { event, jsEvent } = clickInfo;
    // Class-schedule events from the Schedule Import are read-only; ignore clicks.
    if (event.extendedProps.isScheduleEvent) return;
    const start = new Date(event.start);
    const end = new Date(event.end);

    // Determine if user can edit this booking
    const isOwner = event.extendedProps.createdById === currentUserId;
    const canEdit = isOwner || canManageAllBookings;

    setViewingBooking({
      id: event.id,
      title: event.title,
      description: event.extendedProps.description || '',
      roomId: event.extendedProps.roomId,
      roomName: event.extendedProps.roomName || 'Unknown',
      date: dayjs(start).format('YYYY-MM-DD'),
      startTime: dayjs(start).format('HH:mm'),
      endTime: dayjs(end).format('HH:mm'),
      createdBy: event.extendedProps.createdBy || 'Unknown',
      createdById: event.extendedProps.createdById,
      status: event.extendedProps.status || 'PENDING',
      seriesId: event.extendedProps.seriesId ?? null,
      originalStart: event.extendedProps.originalStart ?? (event.extendedProps.isVirtual ? new Date(event.start).toISOString() : null),
      isVirtual: !!event.extendedProps.isVirtual,
      isRecurring: !!event.extendedProps.isRecurring,
    });
    setCanEditBooking(canEdit);

    setPopoverPosition({
      x: jsEvent.clientX,
      y: jsEvent.clientY,
    });
    setPopoverTimes({ start, end });
    setShowPopover(true);
  };

  // Handle updating an existing booking
  const handlePopoverUpdate = async (id: string, data: {
    title: string;
    description: string;
    roomId: number;
    date: string;
    startTime: string;
    endTime: string;
  }, applyToSeries?: boolean) => {
    setIsSubmitting(true);
    try {
      const startDateTime = `${data.date}T${data.startTime}:00`;
      const endDateTime = `${data.date}T${data.endTime}:00`;

      // Recurring instance — the popover's "Apply to all events" checkbox
      // tells us whether to override one occurrence or update the whole series.
      const seriesId = viewingBooking?.seriesId;
      const originalStart = viewingBooking?.originalStart;
      if (seriesId && originalStart) {
        if (!applyToSeries) {
          // Single occurrence → override row.
          await upsertSeriesOverride(seriesId, {
            Original_Start: originalStart,
            Start_Time: new Date(startDateTime).toISOString(),
            End_Time: new Date(endDateTime).toISOString(),
            Room_ID: data.roomId,
            Purpose: data.title,
            Notes: data.description,
          });
        } else {
          // Whole series → PATCH series. Title/Notes always propagate.
          // If the user shifted time-of-day or room, propagate those onto
          // the series's anchor so every virtual occurrence shifts in turn.
          const newStartDate = new Date(startDateTime);
          const newEndDate = new Date(endDateTime);
          const orig = new Date(originalStart);
          const tShift = (
            newStartDate.getHours() !== orig.getHours() ||
            newStartDate.getMinutes() !== orig.getMinutes() ||
            (newEndDate.getTime() - newStartDate.getTime()) !==
              (new Date(`${viewingBooking.date}T${viewingBooking.endTime}:00`).getTime() -
               new Date(`${viewingBooking.date}T${viewingBooking.startTime}:00`).getTime())
          );

          const payload: Parameters<typeof updateBookingSeries>[1] = {
            Title: data.title,
            Purpose: data.title,
            Notes: data.description,
          };
          if (data.roomId !== viewingBooking.roomId) payload.Room_ID = data.roomId;
          if (tShift) {
            // Anchor stays on the original date; only its time-of-day moves
            // so the rule keeps generating from the same starting point.
            const newAnchorStart = new Date(orig);
            newAnchorStart.setHours(newStartDate.getHours(), newStartDate.getMinutes(), 0, 0);
            const newAnchorEnd = new Date(newAnchorStart.getTime() + (newEndDate.getTime() - newStartDate.getTime()));
            payload.Anchor_Start = newAnchorStart.toISOString();
            payload.Anchor_End = newAnchorEnd.toISOString();
          }
          await updateBookingSeries(seriesId, payload);
        }

        await loadBookings();
        setShowPopover(false);
        setViewingBooking(null);
        setCanEditBooking(false);
        return;
      }

      await updateBooking(parseInt(id), {
        Room_ID: data.roomId,
        Start_Time: startDateTime,
        End_Time: endDateTime,
        Purpose: data.title,
      });

      // Update local state
      const room = rooms.find(r => r.Room_ID === data.roomId);
      setEvents(prev => prev.map(e =>
        e.id === id
          ? {
            ...e,
            title: data.title,
            start: startDateTime,
            end: endDateTime,
            extendedProps: {
              ...e.extendedProps,
              roomId: data.roomId,
              roomName: room?.Name || 'Unknown',
              description: data.description,
            },
          }
          : e
      ));

      setShowPopover(false);
      setViewingBooking(null);
      setCanEditBooking(false);
    } catch (error: any) {
      console.error('Failed to update booking:', error);
      const detail = error.response?.data?.details || error.response?.data?.error;
      await modal.showError(detail || 'Failed to update booking', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter events by selected rooms
  const filteredEvents = events.filter(e =>
    selectedRooms.includes(e.extendedProps.roomId) &&
    e.extendedProps.status !== 'REJECTED'
  );

  const scheduleColor = '#6f7f8f';

  const statusColor: Record<string, string> = {
    APPROVED: '#22c55e',
    PENDING: '#eab308',
    CANCELLED: '#6b7280'
  };

  const bookableRooms = useMemo(
    () => allowedRoomTypeSet ? rooms.filter(room => allowedRoomTypeSet.has(room.Room_Type)) : rooms,
    [rooms, allowedRoomTypeSet]
  );

  // Recurring class-schedule events from the Schedule Import. Rendered as
  // non-editable red blocks alongside booking events so users can see when a
  // room is occupied by a scheduled class.
  const scheduleEvents = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const result: any[] = [];
    for (const room of rooms) {
      if (!selectedRooms.includes(room.Room_ID)) continue;
      if (!room.Schedule || room.Schedule.length === 0) continue;
      for (const sched of room.Schedule) {
        const days = sched.Days?.split(',')
          .map(d => parseInt(d.trim(), 10))
          .filter(d => !Number.isNaN(d)) ?? [];
        if (days.length === 0) continue;
        const start = new Date(sched.Start_Time);
        const end = new Date(sched.End_Time);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
        result.push({
          id: `schedule-${sched.Schedule_ID}`,
          title: sched.Title || sched.Schedule_Type || 'Scheduled Class',
          daysOfWeek: days,
          startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}:00`,
          endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}:00`,
          editable: false,
          startEditable: false,
          durationEditable: false,
          extendedProps: {
            isScheduleEvent: true,
            roomId: room.Room_ID,
            roomName: room.Name,
            scheduleType: sched.Schedule_Type,
          },
        });
      }
    }
    return result;
  }, [rooms, selectedRooms]);

  const calendarEvents = useMemo(
    () => [...filteredEvents, ...scheduleEvents],
    [filteredEvents, scheduleEvents]
  );

  // Client-side conflict probe used by the booking popover + recurrence
  // modal to flag bad slots BEFORE the user submits. Walks the rooms[]
  // schedule expansion (Days + time-of-day) and the loaded events list
  // (approved bookings only, to avoid noise from PENDING). Returns a short
  // human reason or null when the slot is free.
  const checkSlotConflict = useCallback(
    (roomId: number, start: Date, end: Date): string | null => {
      const room = rooms.find(r => r.Room_ID === roomId);
      if (room?.Schedule) {
        for (const sched of room.Schedule) {
          const days = (sched.Days || '')
            .split(',')
            .map(d => parseInt(d.trim(), 10))
            .filter(d => !Number.isNaN(d));
          if (!days.includes(start.getDay())) continue;
          const sStart = new Date(sched.Start_Time);
          const sEnd = new Date(sched.End_Time);
          const startMin = start.getHours() * 60 + start.getMinutes();
          const endMin = end.getHours() * 60 + end.getMinutes();
          const sStartMin = sStart.getHours() * 60 + sStart.getMinutes();
          const sEndMin = sEnd.getHours() * 60 + sEnd.getMinutes();
          if (startMin < sEndMin && endMin > sStartMin) {
            return `Class: ${sched.Title || sched.Schedule_Type || 'Scheduled'}`;
          }
        }
      }
      for (const e of events) {
        if (e.extendedProps.roomId !== roomId) continue;
        if (e.extendedProps.status !== 'APPROVED') continue;
        const eStart = new Date(e.start);
        const eEnd = new Date(e.end);
        if (start < eEnd && end > eStart) {
          return `Booked by ${e.extendedProps.createdBy || 'someone else'}`;
        }
      }
      return null;
    },
    [rooms, events]
  );

  const noRoomsMessage = allowedRoomTypes?.length
    ? 'No rooms matching the allowed room types are available for booking.'
    : 'No rooms are available for booking.';

  return (
    <div className="box-border h-full bg-[#f4f7fa] p-4 dark:bg-[#101828]">
      <div className="flex h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e2939]">
        {/* Left Sidebar */}
        <CalendarSidebar
          rooms={rooms}
          selectedRooms={selectedRooms}
          onRoomToggle={handleRoomToggle}
          onDateSelect={handleSidebarDateSelect}
          selectedDate={selectedDate}
          onCreateClick={handleCreateClick}
          borrowingRequests={borrowingRequests}
          showBorrowingRequests={userRole === 'FACULTY'}
          showRejectedBookings={showRejectedMyBookings}
          myBookings={events.filter(e =>
            e.extendedProps.createdById === currentUserId &&
            (showRejectedMyBookings || e.extendedProps.status !== 'REJECTED')
          )}
          onBookingClick={(booking) => {
            const start = new Date(booking.start);
            const end = new Date(booking.end);

            setViewingBooking({
              id: booking.id,
              title: booking.title,
              description: booking.extendedProps.description || '',
              roomId: booking.extendedProps.roomId,
              roomName: booking.extendedProps.roomName || 'Unknown',
              date: dayjs(start).format('YYYY-MM-DD'),
              startTime: dayjs(start).format('HH:mm'),
              endTime: dayjs(end).format('HH:mm'),
              createdBy: booking.extendedProps.createdBy || 'Unknown',
              createdById: booking.extendedProps.createdById,
              status: booking.extendedProps.status || 'PENDING',
              seriesId: booking.extendedProps.seriesId ?? null,
              originalStart: booking.extendedProps.originalStart ?? (booking.extendedProps.isVirtual ? new Date(booking.start).toISOString() : null),
              isVirtual: !!booking.extendedProps.isVirtual,
              isRecurring: !!booking.extendedProps.isRecurring,
            });
            setCanEditBooking(booking.extendedProps.createdById === currentUserId || canManageAllBookings);

            // Center the popover
            setPopoverPosition({
              x: window.innerWidth / 2,
              y: window.innerHeight / 2
            });
            setPopoverTimes({ start, end });
            setShowPopover(true);
          }}
        />

        {/* Main Calendar Area */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Top Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm shadow-slate-200/60 dark:border-[#334155] dark:bg-[#1e2939] dark:shadow-none">
          <div className="flex items-center gap-4">
            <div className="mr-2 hidden lg:block">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{selectedRooms.length} room{selectedRooms.length === 1 ? '' : 's'} visible</p>
            </div>
            <button
              onClick={goToToday}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-[#4a5563] dark:bg-transparent dark:text-gray-300 dark:hover:bg-[#2b3440]"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button onClick={goToPrev} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-[#2b3440] dark:hover:text-white">
                ‹
              </button>
              <button onClick={goToNext} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-[#2b3440] dark:hover:text-white">
                ›
              </button>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{currentDate}</h1>
            <div className="hidden items-center gap-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-white/[0.05] dark:text-slate-300 xl:flex">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Approved</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" />Pending</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Selector */}
            <div className="flex rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200 dark:bg-[#2b3440] dark:ring-transparent">
              {(['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'listWeek'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => {
                    setCalendarView(view);
                    calendarRef.current?.getApi()?.changeView(view);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${calendarView === view
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#3a4451] dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                >
                  {view === 'timeGridDay' ? 'Day' : view === 'timeGridWeek' ? 'Week' : view === 'dayGridMonth' ? 'Month' : 'List'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-auto p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={calendarView}
            headerToolbar={false}
            selectable={true}
            selectMirror={true}
            // Block selecting time ranges that start in the past — bookings
            // must be for now or later. Backend enforces this too.
            selectAllow={(selectInfo) => selectInfo.start.getTime() > Date.now()}
            editable={true}
            eventDurationEditable={false}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventMouseEnter={(info) => {
              const rect = info.el.getBoundingClientRect();
              const ep = info.event.extendedProps;
              setTooltipInfo({
                visible: true,
                x: rect.left + rect.width / 2,
                y: rect.top - 8,
                title: info.event.title,
                roomName: ep.roomName || 'Unknown',
                time: `${dayjs(info.event.start).format('h:mm A')} – ${dayjs(info.event.end).format('h:mm A')}`,
                createdBy: ep.isScheduleEvent ? 'Class Schedule' : (ep.createdBy || 'Unknown'),
                status: ep.isScheduleEvent ? 'CLASS' : (ep.status || 'PENDING'),
              });
            }}
            eventMouseLeave={() => setTooltipInfo(prev => ({ ...prev, visible: false }))}
            events={calendarEvents}
            eventColor={scheduleColor}
            eventBackgroundColor={scheduleColor}
            eventBorderColor={scheduleColor}
            eventTextColor="#ffffff"
            eventContent={(arg) => {
              const { event, view } = arg;
              const roomName = event.extendedProps.roomName as string | undefined;
              const isScheduleEvent = event.extendedProps.isScheduleEvent as boolean | undefined;

              // In list view we render plain inline content so FullCalendar's
              // built-in row layout (.fc-list-event-title CSS) handles colors
              // and spacing. Returning a colored block here would clash with
              // the table layout and end up white-on-white in light mode.
              if (view.type.startsWith('list')) {
                return (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{event.title}</span>
                    {roomName && (
                      <span className="text-slate-500 dark:text-slate-400">— {roomName}</span>
                    )}
                    {isScheduleEvent && (
                      <span className="rounded bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pink-700 dark:bg-pink-300/30 dark:text-pink-200">
                        Class
                      </span>
                    )}
                  </span>
                );
              }

              const start = event.start ? event.start.getTime() : 0;
              const end = event.end ? event.end.getTime() : start + 60 * 60 * 1000;
              const durationMin = (end - start) / 60000;
              const isShort = durationMin <= 30;

              if (isScheduleEvent) {
                return (
                  <div
                    className={`schedule-class-event flex h-full w-full overflow-hidden rounded bg-pink-200 px-2 text-xs text-pink-900 dark:bg-pink-300/80 dark:text-pink-950 ${
                      isShort ? 'items-center py-0' : 'flex-col justify-start py-1'
                    }`}
                  >
                    <div className="min-w-0 truncate font-medium leading-tight">{event.title}</div>
                    {!isShort && roomName && (
                      <div className="truncate text-[11px] leading-tight opacity-80">{roomName}</div>
                    )}
                  </div>
                );
              }

              const status = event.extendedProps.status as string;

              return (
                <div
                  className={`schedule-calendar-event relative flex h-full w-full overflow-hidden rounded px-2 pr-5 text-xs text-white ${
                    isShort ? 'items-center py-0' : 'flex-col justify-start py-1'
                  }`}
                >
                  <span
                    className={`absolute right-1.5 ${isShort ? 'top-1/2 -translate-y-1/2' : 'top-1.5'} h-2.5 w-2.5 rounded-full ring-1 ring-white/70 dark:ring-gray-900/70`}
                    style={{ backgroundColor: statusColor[status] || '#6366f1' }}
                    title={status}
                    aria-label={`Status: ${status}`}
                  />
                  <div className="min-w-0 truncate font-medium leading-tight">{event.title}</div>
                  {!isShort && roomName && (
                    <div className="truncate text-[11px] leading-tight opacity-90">{roomName}</div>
                  )}
                </div>
              );
            }}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            height="100%"
            datesSet={updateCurrentDate}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
            nowIndicator={true}
            expandRows={true}
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
          />
        </div>
      </div>
      </div>

      {/* Booking Popover */}
      <BookingPopover
        isOpen={showPopover}
        recurrenceConflicts={seriesConflicts ?? undefined}
        checkConflict={checkSlotConflict}
        onClose={() => {
          setShowPopover(false);
          setViewingBooking(null);
          setCanEditBooking(false);
          setSeriesConflicts(null);
        }}
        onSave={handlePopoverSave}
        onUpdate={handlePopoverUpdate}
        onApprove={async (id, applyToSeries) => {
          setIsSubmitting(true);
          try {
            // Recurring path — never call /bookings/:id/status with a virtual id.
            if (viewingBooking?.seriesId && viewingBooking.originalStart) {
              const result = await decideSeriesStatus(viewingBooking.seriesId, {
                status: 'APPROVED',
                applyToSeries: !!applyToSeries,
                Original_Start: viewingBooking.originalStart,
              });
              await loadBookings();
              setShowPopover(false);
              setViewingBooking(null);

              // Surface partial-rejection summary so the approver sees what
              // got auto-rejected for conflicts.
              if (applyToSeries && Array.isArray(result.conflicts) && result.conflicts.length > 0) {
                const sample = result.conflicts.slice(0, 5).map((c) => {
                  const when = new Date(c.when).toLocaleString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  });
                  return `• ${when} — ${c.reason}`;
                }).join('\n');
                const extra = result.conflicts.length > 5 ? `\n…and ${result.conflicts.length - 5} more` : '';
                await modal.showAlert(
                  `Approved ${result.approved} of ${result.totalOccurrences} occurrences.\n\nThe following were auto-rejected with a reason:\n\n${sample}${extra}`,
                  'Series approved with exceptions'
                );
              } else {
                await modal.showSuccess(
                  applyToSeries
                    ? `Approved ${result.approved} occurrence${typeof result.approved === 'number' && result.approved !== 1 ? 's' : ''}.`
                    : 'This occurrence was approved.',
                  'Approved'
                );
              }
              return;
            }

            await updateBookingStatus(parseInt(id), { status: 'APPROVED', approverId: currentUserId });
            setEvents(prev => prev.map(e =>
              e.id === id ? { ...e, extendedProps: { ...e.extendedProps, status: 'APPROVED' } } : e
            ));
            setShowPopover(false);
            setViewingBooking(null);
          } catch (error: any) {
            console.error('Failed to approve booking:', error);
            const detail = error.response?.data?.details || error.response?.data?.error;
            await modal.showError(detail || 'Failed to approve booking', 'Error');
          } finally {
            setIsSubmitting(false);
          }
        }}
        onReject={async (id, applyToSeries) => {
          setIsSubmitting(true);
          try {
            if (viewingBooking?.seriesId && viewingBooking.originalStart) {
              await decideSeriesStatus(viewingBooking.seriesId, {
                status: 'REJECTED',
                applyToSeries: !!applyToSeries,
                Original_Start: viewingBooking.originalStart,
              });
              await loadBookings();
              setShowPopover(false);
              setViewingBooking(null);
              return;
            }

            await updateBookingStatus(parseInt(id), { status: 'REJECTED', approverId: currentUserId });
            setEvents(prev => prev.map(e =>
              e.id === id ? { ...e, extendedProps: { ...e.extendedProps, status: 'REJECTED' } } : e
            ));
            setShowPopover(false);
            setViewingBooking(null);
          } catch (error: any) {
            console.error('Failed to reject booking:', error);
            const detail = error.response?.data?.details || error.response?.data?.error;
            await modal.showError(detail || 'Failed to reject booking', 'Error');
          } finally {
            setIsSubmitting(false);
          }
        }}
        onRemove={async (id, applyToSeries) => {
          setIsSubmitting(true);
          try {
            // Recurring instance — popover passed the "apply to all" checkbox state.
            if (viewingBooking?.seriesId && viewingBooking.originalStart) {
              if (applyToSeries) {
                await deleteBookingSeries(viewingBooking.seriesId);
              } else {
                await excludeSeriesDate(viewingBooking.seriesId, viewingBooking.originalStart);
              }
              await loadBookings();
              setShowPopover(false);
              setViewingBooking(null);
              setCanEditBooking(false);
              return;
            }

            await updateBookingStatus(parseInt(id), { status: 'CANCELLED', approverId: currentUserId });
            // Remove from calendar
            setEvents(prev => prev.filter(e => e.id !== id));
            setShowPopover(false);
            setViewingBooking(null);
            setCanEditBooking(false);
          } catch (error: any) {
            console.error('Failed to remove booking:', error);
            const detail = error.response?.data?.details || error.response?.data?.error;
            await modal.showError(detail || 'Failed to remove booking', 'Error');
          } finally {
            setIsSubmitting(false);
          }
        }}
        startTime={popoverTimes.start}
        endTime={popoverTimes.end}
        rooms={bookableRooms}
        selectedRoomId={bookableRooms.find(room => selectedRooms.includes(room.Room_ID))?.Room_ID ?? bookableRooms[0]?.Room_ID}
        isSubmitting={isSubmitting}
        viewingBooking={viewingBooking}
        canEdit={canEditBooking}
        canApprove={(() => {
          const viewingRoomType = rooms.find(r => r.Room_ID === viewingBooking?.roomId)?.Room_Type;
          if (viewingRoomType === 'CONFERENCE' || viewingRoomType === 'CONSULTATION') {
            return userRole === 'SECRETARY';
          }
          return userRole === 'LAB_HEAD' || userRole === 'LAB_TECH';
        })()}
      />

      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
        onSubmit={async (description, issueType, equipment, pcNumber, noRoom) => {
          console.log('Submitting issue:', { description, issueType, equipment, pcNumber, noRoom });
        }}
        room={rooms.find(r => r.Room_ID === selectedRooms[0])?.Name || ''}
        pcNumber="N/A"
      />

      <WarningModal
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal(prev => ({ ...prev, isOpen: false }))}
        title={warningModal.title}
        message={warningModal.message}
        type={warningModal.type}
      />

      <ConfirmModal
        isOpen={!!pendingDrag}
        onConfirm={handleConfirmDrag}
        onCancel={handleCancelDrag}
        title="Reschedule Booking?"
        message="Do you want to move this booking to the new time?"
        confirmText="Reschedule"
        cancelText="Cancel"
        isLoading={isSubmitting}
        eventDetails={pendingDrag ? {
          title: pendingDrag.event.title,
          oldStart: pendingDrag.oldStart,
          oldEnd: pendingDrag.oldEnd,
          newStart: pendingDrag.newStart,
          newEnd: pendingDrag.newEnd,
        } : undefined}
      />

      {/* Hover Tooltip */}
      {tooltipInfo.visible && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltipInfo.x, top: tooltipInfo.y }}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs max-w-xs">
            <div className="font-semibold text-gray-900 dark:text-white truncate">{tooltipInfo.title}</div>
            <div className="flex items-center gap-1.5 mt-1 text-gray-600 dark:text-gray-400">
              <span>{tooltipInfo.roomName}</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>{tooltipInfo.time}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-500 dark:text-gray-400">{tooltipInfo.createdBy}</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor[tooltipInfo.status] || '#6366f1' }} />
                <span className="text-gray-500 dark:text-gray-400 capitalize">{tooltipInfo.status.toLowerCase()}</span>
              </span>
            </div>
          </div>
          <div className="w-2 h-2 bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 transform rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
