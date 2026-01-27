import { getRooms } from "@/services/room";
import type { Room } from '@/types/room';
import { useRef, useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { CalendarApi, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import ReportIssueModal from '../../components/student/Modals/ReportIssue';
import { getBookings, createBooking, updateBooking, updateBookingStatus } from "@/services/booking";
import type { Booking } from '@/types/booking';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import CalendarSidebar from '@/components/Scheduling/CalendarSidebar';
import BookingPopover from '@/components/Scheduling/BookingPopover';
import WarningModal from '@/components/Scheduling/WarningModal';
import ConfirmModal from '@/components/Scheduling/ConfirmModal';
import { useBookingEvents } from '@/hooks/useBookingEvents';
import type { BorrowingRequest } from '@/components/borrowing/RequestCard';

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
  }, [userRole]);

  const loadBookings = useCallback(async () => {
    try {
      const bookings = await getBookings();
      const mapped = bookings
        .filter((b: Booking) => b.Status !== 'CANCELLED' && b.Status !== 'REJECTED')
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
  }, []);

  // Subscribe to real-time booking events
  useBookingEvents(useCallback((event) => {
    console.log('[Scheduling] Received real-time booking event:', event.type);
    // Reload bookings when any booking event is received
    loadBookings();
  }, [loadBookings]));

  // Load borrowing requests (mock data for now, will be replaced with API call)
  const loadBorrowingRequests = async () => {
  };

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
  const filteredEvents = events.filter(e => selectedRooms.includes(e.extendedProps.roomId));

  const statusColor: Record<string, string> = {
    APPROVED: '#22c55e',
    PENDING: '#eab308',
    REJECTED: '#ef4444',
    CANCELLED: '#6b7280'
  };

  return (
    <div className="flex h-screen bg-gray-900">
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
      />

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-4 py-1.5 text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button onClick={goToPrev} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full">
                ‹
              </button>
              <button onClick={goToNext} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full">
                ›
              </button>
            </div>
            <h1 className="text-xl font-medium text-white">{currentDate}</h1>
          </div>

          {/* View Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'listWeek'] as const).map((view) => (
              <button
                key={view}
                onClick={() => {
                  setCalendarView(view);
                  calendarRef.current?.getApi()?.changeView(view);
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${calendarView === view
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                {view === 'timeGridDay' ? 'Day' : view === 'timeGridWeek' ? 'Week' : view === 'dayGridMonth' ? 'Month' : 'List'}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-auto p-2">
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
            events={filteredEvents}
            eventBackgroundColor="#4f46e5"
            eventBorderColor="transparent"
            eventContent={({ event }) => {
              const status = event.extendedProps.status as string;
              const timeText = event.start && event.end
                ? `${dayjs(event.start).format('h:mma')}`
                : '';

              return (
                <div
                  className="px-2 py-1 rounded text-xs overflow-hidden"
                  style={{ borderLeft: `3px solid ${statusColor[status] || '#6366f1'}` }}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  <div className="text-gray-300 opacity-75">{timeText}</div>
                </div>
              );
            }}
            slotMinTime="07:00:00"
            slotMaxTime="19:00:00"
            height="100%"
            datesSet={updateCurrentDate}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
            nowIndicator={true}
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
        onSubmit={async (description, issueType, equipment) => {
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
    </div>
  );
}
