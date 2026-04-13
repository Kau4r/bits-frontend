import { getRooms } from "@/services/room";
import type { Room } from '@/types/room';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { CalendarApi, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Grid3X3, LayoutList } from 'lucide-react';
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

const viewOptions = [
  { id: 'timeGridDay', label: 'Day', icon: Clock3 },
  { id: 'timeGridWeek', label: 'Week', icon: CalendarDays },
  { id: 'dayGridMonth', label: 'Month', icon: Grid3X3 },
  { id: 'listWeek', label: 'List', icon: LayoutList },
] as const;

const statusColor: Record<string, string> = {
  APPROVED: '#22c55e',
  PENDING: '#f59e0b',
  REJECTED: '#ef4444',
  CANCELLED: '#6b7280'
};

const statusLabel: Record<string, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
};

export default function Scheduling() {
  const { user } = useAuth();
  const modal = useModal();
  const currentUserId = user?.User_ID ?? 0;
  const userRole = user?.User_Role.toUpperCase() ?? 'FACULTY';
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
        .filter((b: Booking) => b.Status !== 'CANCELLED' && (b.Status !== 'REJECTED' || b.User_ID === currentUserId))
        .map((b: Booking) => ({
          id: String(b.Booked_Room_ID),
          title: b.Purpose ?? 'No Title',
          start: b.Start_Time,
          end: b.End_Time,
          extendedProps: {
            roomId: b.Room_ID,
            roomName: b.Room?.Name ?? 'Unknown',
            status: b.Status?.toUpperCase() || 'PENDING',
            createdBy: b.User ? `${b.User.First_Name || ''} ${b.User.Last_Name || ''}`.trim() : 'Unknown',
            createdById: b.User_ID,
            description: b.Notes ?? '',
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
        const roomsData = await getRooms();
        if (roomsData.length > 0) {
          setSelectedRooms(roomsData.map(r => r.Room_ID)); // Select ALL rooms by default
        }
        setRooms(roomsData);
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
        // Don't allow deselecting all rooms
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== roomId);
      }
      return [...prev, roomId];
    });
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    calendarRef.current?.getApi()?.unselect();

    // Check all selected rooms for overlap
    for (const roomId of selectedRooms) {
      const overlap = checkOverlap(selectInfo.start, selectInfo.end, roomId);
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
  }) => {
    setIsSubmitting(true);
    try {
      const startDateTime = `${data.date}T${data.startTime}:00`;
      const endDateTime = `${data.date}T${data.endTime}:00`;

      const newBooking = await createBooking({
        User_ID: currentUserId,
        Room_ID: data.roomId,
        Start_Time: startDateTime,
        End_Time: endDateTime,
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
    if (event.extendedProps.createdById !== currentUserId && userRole !== 'ADMIN') {
      setWarningModal({
        isOpen: true,
        title: 'Permission Denied',
        message: 'You can only reschedule your own bookings.',
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
    const start = new Date(event.start);
    const end = new Date(event.end);

    // Determine if user can edit this booking
    const isOwner = event.extendedProps.createdById === currentUserId;
    const isAdmin = userRole === 'ADMIN';
    const canEdit = isOwner || isAdmin;

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
  }) => {
    setIsSubmitting(true);
    try {
      const startDateTime = `${data.date}T${data.startTime}:00`;
      const endDateTime = `${data.date}T${data.endTime}:00`;

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
    } catch (error) {
      console.error('Failed to update booking:', error);
      await modal.showError('Failed to update booking', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter events by selected rooms
  const filteredEvents = events.filter(e =>
    selectedRooms.includes(e.extendedProps.roomId) &&
    e.extendedProps.status !== 'REJECTED'
  );

  const scheduleStats = useMemo(() => {
    return filteredEvents.reduce(
      (acc, event) => {
        const status = String(event.extendedProps.status || 'PENDING').toUpperCase();
        acc.total += 1;
        if (status === 'APPROVED') acc.approved += 1;
        if (status === 'PENDING') acc.pending += 1;
        if (status === 'REJECTED') acc.rejected += 1;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, rejected: 0 }
    );
  }, [filteredEvents]);

  const selectedRoomSummary = selectedRooms.length === rooms.length
    ? `${rooms.length} rooms selected`
    : `${selectedRooms.length} of ${rooms.length} rooms selected`;

  return (
    <div className="flex h-full overflow-hidden bg-slate-100 text-slate-950 dark:bg-[#07111f] dark:text-white">
      {/* Left Sidebar */}
      <CalendarSidebar
        rooms={rooms}
        selectedRooms={selectedRooms}
        onRoomToggle={handleRoomToggle}
        onSelectAll={(selectAll) => {
          if (selectAll) {
            setSelectedRooms(rooms.map(r => r.Room_ID));
          } else {
            setSelectedRooms([]);
          }
        }}
        onDateSelect={handleSidebarDateSelect}
        selectedDate={selectedDate}
        onCreateClick={handleCreateClick}
        borrowingRequests={borrowingRequests}
        showBorrowingRequests={userRole === 'FACULTY'}
        myBookings={events.filter(e => e.extendedProps.createdById === currentUserId)}
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
          });
          setCanEditBooking(booking.extendedProps.createdById === currentUserId || userRole === 'ADMIN');

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
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 lg:px-6">
        <section className="mb-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
                <span className="rounded-full bg-indigo-50 px-3 py-1 dark:bg-cyan-400/10">Scheduling</span>
                <span className="text-slate-400 dark:text-slate-600">/</span>
                <span className="text-slate-500 dark:text-slate-400">{selectedRoomSummary}</span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{currentDate}</h1>
                <p className="pb-1 text-sm text-slate-500 dark:text-slate-400">
                  {scheduleStats.total} visible booking{scheduleStats.total === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-950/70">
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Today
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
                <button
                  type="button"
                  onClick={goToPrev}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Previous date range"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Next date range"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-950/70">
                {viewOptions.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setCalendarView(id);
                      calendarRef.current?.getApi()?.changeView(id);
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${calendarView === id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 dark:bg-cyan-400 dark:text-slate-950 dark:shadow-cyan-400/20'
                      : 'text-slate-500 hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                  >
                    <Icon className="hidden h-4 w-4 sm:block" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Visible', value: scheduleStats.total, color: 'bg-indigo-500', helper: 'selected rooms' },
              { label: 'Approved', value: scheduleStats.approved, color: 'bg-emerald-500', helper: 'ready to use' },
              { label: 'Pending', value: scheduleStats.pending, color: 'bg-amber-500', helper: 'awaiting review' },
              { label: 'Rooms', value: selectedRooms.length, color: 'bg-sky-500', helper: `${rooms.length} total` },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
                  </div>
                  <span className={`h-3 w-3 rounded-full ${item.color} ring-4 ring-white dark:ring-slate-900`} />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{item.helper}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Calendar */}
        <div className="bits-schedule-calendar min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/20">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={calendarView}
            headerToolbar={false}
            selectable={true}
            selectMirror={true}
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
                time: `${dayjs(info.event.start).format('h:mm A')} - ${dayjs(info.event.end).format('h:mm A')}`,
                createdBy: ep.createdBy || 'Unknown',
                status: ep.status || 'PENDING',
              });
            }}
            eventMouseLeave={() => setTooltipInfo(prev => ({ ...prev, visible: false }))}
            events={filteredEvents}
            eventClassNames={(arg) => {
              const status = String(arg.event.extendedProps.status || 'PENDING').toLowerCase();
              return ['bits-schedule-event', `bits-schedule-event--${status}`];
            }}
            eventBackgroundColor="transparent"
            eventBorderColor="transparent"
            eventContent={({ event }) => {
              const status = String(event.extendedProps.status || 'PENDING').toUpperCase();
              const timeText = event.start && event.end
                ? `${dayjs(event.start).format('h:mma')} - ${dayjs(event.end).format('h:mma')}`
                : '';
              const roomName = event.extendedProps.roomName || 'Room not set';

              return (
                <div className="relative flex h-full min-h-[34px] flex-col justify-between overflow-hidden rounded-xl px-2.5 py-1.5 text-[11px] leading-tight text-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold uppercase tracking-wide">{event.title}</div>
                      <div className="mt-0.5 truncate text-white/75">{roomName}</div>
                    </div>
                    <span
                      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/70"
                      style={{ backgroundColor: statusColor[status] || '#6366f1' }}
                      title={statusLabel[status] || status}
                      aria-label={`Status: ${statusLabel[status] || status}`}
                    />
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-white/80">
                    <Clock3 className="h-3 w-3" />
                    <span className="truncate">{timeText}</span>
                  </div>
                </div>
              );
            }}
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            height="100%"
            datesSet={updateCurrentDate}
            dayHeaderContent={(args) => (
              <div className="flex flex-col items-center gap-1 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {dayjs(args.date).format('ddd')}
                </span>
                <span className="text-xl font-black text-slate-950 dark:text-white">
                  {dayjs(args.date).format('D')}
                </span>
              </div>
            )}
            nowIndicator={true}
            expandRows={true}
            slotDuration="00:30:00"
            snapDuration="00:30:00"
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
          />
        </div>
      </div>

      {/* Booking Popover */}
      <BookingPopover
        isOpen={showPopover}
        onClose={() => {
          setShowPopover(false);
          setViewingBooking(null);
          setCanEditBooking(false);
        }}
        onSave={handlePopoverSave}
        onUpdate={handlePopoverUpdate}
        onApprove={async (id) => {
          setIsSubmitting(true);
          try {
            await updateBookingStatus(parseInt(id), { status: 'APPROVED', approverId: currentUserId });
            setEvents(prev => prev.map(e =>
              e.id === id ? { ...e, extendedProps: { ...e.extendedProps, status: 'APPROVED' } } : e
            ));
            setShowPopover(false);
            setViewingBooking(null);
          } catch (error) {
            console.error('Failed to approve booking:', error);
            await modal.showError('Failed to approve booking', 'Error');
          } finally {
            setIsSubmitting(false);
          }
        }}
        onReject={async (id) => {
          setIsSubmitting(true);
          try {
            await updateBookingStatus(parseInt(id), { status: 'REJECTED', approverId: currentUserId });
            setEvents(prev => prev.map(e =>
              e.id === id ? { ...e, extendedProps: { ...e.extendedProps, status: 'REJECTED' } } : e
            ));
            setShowPopover(false);
            setViewingBooking(null);
          } catch (error) {
            console.error('Failed to reject booking:', error);
            await modal.showError('Failed to reject booking', 'Error');
          } finally {
            setIsSubmitting(false);
          }
        }}
        onRemove={async (id) => {
          setIsSubmitting(true);
          try {
            await updateBookingStatus(parseInt(id), { status: 'CANCELLED', approverId: currentUserId });
            // Remove from calendar
            setEvents(prev => prev.filter(e => e.id !== id));
            setShowPopover(false);
            setViewingBooking(null);
            setCanEditBooking(false);
          } catch (error) {
            console.error('Failed to remove booking:', error);
            await modal.showError('Failed to remove booking', 'Error');
          } finally {
            setIsSubmitting(false);
          }
        }}
        startTime={popoverTimes.start}
        endTime={popoverTimes.end}
        rooms={rooms}
        selectedRoomId={selectedRooms[0]}
        isSubmitting={isSubmitting}
        viewingBooking={viewingBooking}
        canEdit={canEditBooking}
        canApprove={userRole === 'LAB_HEAD'}
      />

      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
        onSubmit={async (description: string, issueType: string, equipment: string) => {
          console.log('Submitting issue:', { description, issueType, equipment });
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
