import { getRooms } from "@/services/room";
import type { Room } from '@/types/room';
import { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { DateSelectArg, CalendarApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import ReportIssueModal from '../../components/student/Modals/ReportIssue';
import { getBookings, createBooking, updateBookingStatus } from "@/services/booking";
import type { Booking } from '@/types/booking';
import type { Borrowing } from '@/types/borrowing';

import { useAuth } from '@/context/AuthContext';


const DAY_INDEX_TO_CODE = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
const INITIAL_FORM = {
  title: '',
  description: '',
  startDate: '',
  startTime: '',
  endTime: '',
  repeat: false,
  repeatDays: [...DAY_INDEX_TO_CODE],
  endDate: '',
  borrowedItems: [], // ensure proper type
};


const MOCK_ITEMS = Object.freeze([
  { id: 'item_a', name: 'Projector A' },
  { id: 'item_b', name: 'Laptop B' },
  { id: 'item_c', name: 'Microphone C' },
]);


export default function Scheduling() {
  const { user } = useAuth();
  const currentUserId = user?.User_ID ?? 0;
  const userRole = user?.User_Role.toUpperCase() ?? 'LAB_TECH';
  type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'listWeek'
  const calendarRef = useRef<FullCalendar | null>(null);
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'listWeek'>('timeGridWeek');
  const [currentDate, setCurrentDate] = useState(dayjs().format('MMMM YYYY'));
  const [events, setEvents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<number>(0);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);

  // Load rooms
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const roomsData = await getRooms();
        if (roomsData.length > 0) setActiveRoom(roomsData[0].Room_ID);
        setRooms(roomsData);
        await loadBookings();
      } catch (error) {
        console.error(error);
      }
    };
    loadInitialData();
  }, []);


  const loadBookings = async () => {
    console.log('[DEBUG] Starting to load bookings...');
    try {
      console.log('[DEBUG] Calling getBookings API...');
      const bookings = await getBookings();
      console.log('[DEBUG] Raw bookings from API:', bookings);

      const mapped = bookings.map((b: Booking) => ({
        id: String(b.Booked_Room_ID),
        title: b.Purpose ?? 'No Title',
        start: b.Start_Time,
        end: b.End_Time,
        extendedProps: {
          roomId: b.Room_ID,
          roomName: b.Room?.Name ?? 'Unknown',
          status: b.Status,
          createdBy: b.Approver
            ? `${b.Approver.First_Name || ''} ${b.Approver.Last_Name || ''}`.trim() || 'Unknown'
            : `${b.User?.First_Name || ''} ${b.User?.Last_Name || ''}`.trim() || 'Unknown',
          createdById: b.User_ID, // <-- add this
          borrowedItems: b.Borrowed_Items || [],
          description: b.Notes ?? '',
        },
      }));



      console.log('[DEBUG] All mapped events:', mapped);
      setEvents(mapped);
    } catch (error) {
      console.error('[ERROR] Error loading bookings:', error);
    }
  };

  const approveEvent = async (booking: Booking) => {
    try {
      const updated = await updateBookingStatus(booking.Booked_Room_ID, {
        status: 'APPROVED',
        approverId: currentUserId,
      });
      setEvents(prev =>
        prev.map(e =>
          e.id === updated.Booked_Room_ID
            ? {
              ...e,
              extendedProps: {
                ...e.extendedProps,
                status: updated.Status,
                borrowedItems: updated.Borrowed_Items,
              },
            }
            : e
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const denyEvent = async (booking: Booking) => {
    try {
      const updated = await updateBookingStatus(booking.Booked_Room_ID, {
        status: 'REJECTED',
        approverId: currentUserId,
      });
      setEvents(prev =>
        prev.map(e =>
          e.extendedProps.roomId === booking.Room_ID
            ? { ...e, extendedProps: { ...e.extendedProps, status: 'REJECTED' } }
            : e
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getDisabledItems = () => {
    return events
      .filter(e => ['APPROVED', 'PENDING'].includes(e.extendedProps.status))
      .filter(e =>
        formData.startDate === dayjs(e.start).format('YYYY-MM-DD') &&
        formData.startTime < dayjs(e.end).format('HH:mm') &&
        formData.endTime > dayjs(e.start).format('HH:mm')
      )
      .flatMap(e => e.extendedProps.borrowedItems);
  };


  interface BorrowedItemSelectProps {
    value: string[];
    onChange: (newValue: string[]) => void;
  }
  function BorrowedItemSelect({ value, onChange }: BorrowedItemSelectProps) {
    return (
      <div>
        <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Borrow Items</label>
        <ul className="space-y-2">
          {value.map((itemId, idx) => {
            const item = MOCK_ITEMS.find(i => i.id === itemId);
            return (
              <li
                key={idx}
                className="flex justify-between items-center bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded"
              >
                <span>{item?.name || itemId}</span>
                <button
                  type="button"
                  className="text-red-500"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  interface BorrowedItemAddControlProps {
    onAdd: (id: string) => void;
    disabledItems?: string[];
  }
  function BorrowedItemAddControl({ onAdd, disabledItems = [] }: BorrowedItemAddControlProps) {
    return (
      <div>
        <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300 mt-3">Add Item to Borrow</label>
        <div className="flex gap-2">
          <select
            className="flex-1 p-2 rounded border dark:bg-gray-700 dark:text-white"
            id="borrow-item-select"
          >
            {MOCK_ITEMS.map((item) => (
              <option key={item.id} value={item.id} disabled={disabledItems.includes(item.id)}>
                {item.name} {disabledItems.includes(item.id) ? '(Unavailable)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              const select = document.getElementById('borrow-item-select') as HTMLSelectElement | null;
              const val = select?.value;
              if (val && !disabledItems.includes(val)) onAdd(val);
            }}
          >
            Add
          </button>
        </div>
      </div>
    );
  }

  const updateCurrentDate = () => {
    const api: CalendarApi | undefined = calendarRef.current?.getApi();
    const date = api?.getDate();
    if (date) setCurrentDate(dayjs(date).format('MMMM YYYY'));
  };


  const changeView = (viewType: CalendarViewType) => {
    setCalendarView(viewType);
    calendarRef.current?.getApi()?.changeView(viewType);
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

  const handleSelect = ({ start, end }: DateSelectArg) => {
    setFormData((prev) => ({
      ...INITIAL_FORM, // reset everything
      startDate: dayjs(start).format('YYYY-MM-DD'),
      startTime: dayjs(start).format('HH:mm'),
      endTime: dayjs(end).format('HH:mm'),
    }));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DEBUG] Form submitted with data:', formData);

    if (!formData.startDate || !formData.startTime || !formData.endTime) {
      console.log('[DEBUG] Validation failed: Missing required fields');
      return alert('Please fill all required fields');
    }

    const bookingData = {
      User_ID: currentUserId,
      Room_ID: activeRoom,
      Start_Time: `${formData.startDate}T${formData.startTime}`,
      End_Time: `${formData.startDate}T${formData.endTime}`,
      Purpose: formData.title,
      Borrowed_Items: formData.borrowedItems,
    };

    console.log('[DEBUG] Sending booking data to API:', bookingData);

    try {
      console.log('[DEBUG] Calling createBooking API...');
      const newBooking = await createBooking(bookingData);
      console.log('[DEBUG] Booking created successfully:', newBooking);

      // Get the room name from the rooms list
      const room = rooms.find(r => r.Room_ID === activeRoom);
      console.log('[DEBUG] Found room:', room);

      const newEvent = {
        id: newBooking.Booked_Room_ID,
        title: newBooking.Purpose ?? 'No Title',
        start: newBooking.Start_Time,
        end: newBooking.End_Time,
        extendedProps: {
          roomId: newBooking.Room_ID,
          roomName: room?.Name || 'Unknown Room',
          status: newBooking.Status,
          createdBy: user ? `${user.First_Name} ${user.Last_Name}` : 'Unknown User',
          borrowedItems: newBooking.Borrowed_Items || [],
          description: newBooking.Notes || '',
        },
      };

      console.log('[DEBUG] Adding new event to calendar:', newEvent);
      setEvents(prev => {
        console.log('[DEBUG] Current events before update:', prev);
        return [...prev, newEvent];
      });
      setFormData(INITIAL_FORM);
      setShowForm(false);

      console.log('[DEBUG] Reloading bookings...');
      await loadBookings();

    } catch (error) {
      console.error('[ERROR] Failed to create booking:', error);
      alert('Failed to create booking. Check console for details.');
    }
  };

  const toggleRepeatDay = (day: typeof DAY_INDEX_TO_CODE[number]) => {
    setFormData((prev) => {
      const days = [...prev.repeatDays];
      const i = days.indexOf(day);
      if (i >= 0) days.splice(i, 1);
      else days.push(day);
      return { ...prev, repeatDays: days };
    });
  };

  const handleEventClick = ({ event }: { event: any }) => {
    console.log('[DEBUG] Event clicked:', event);
    const start = dayjs(event.start);
    const end = dayjs(event.end);

    console.log('[DEBUG] Setting form data from event:', {
      title: event.title,
      start: start.format('YYYY-MM-DD HH:mm'),
      end: end.format('YYYY-MM-DD HH:mm')
    });

    setFormData({
      title: event.title ?? '',
      description: event.extendedProps.description ?? '',
      startDate: start.format('YYYY-MM-DD'),
      startTime: start.format('HH:mm'),
      endTime: end.format('HH:mm'),
      repeat: false,
      repeatDays: [],
      endDate: '',
      borrowedItems: event.extendedProps.borrowedItems ?? [],
    });

    setShowForm(true);
  };

  const filteredEvents = events.filter(e => {
    if (e.extendedProps.roomId !== activeRoom) return false;

    if (userRole === 'ADMIN') return true;
    if (userRole === 'FACULTY' || userRole === 'STUDENT') {
      return (
        e.extendedProps.status === 'APPROVED' ||
        (e.extendedProps.status === 'PENDING' && e.extendedProps.createdById === currentUserId)
      );
    }
    if (userRole === 'LAB_TECH') {
      return e.extendedProps.status === 'APPROVED';
    }
    return false;
  });


  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 p-6  flex flex-col min-h-0">
        <div className="flex justify-between mb-8 mt-2 relative">
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600"
              onClick={() => setShowReportIssueModal(true)}
            >
              Report Issue
            </button>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2">

            <select
              className="p-2 pr-8 rounded bg-gray-800 text-white border border-gray-600"
              value={activeRoom}
              onChange={(e) => setActiveRoom(parseInt(e.target.value))}
            >
              {rooms.map((room) => (
                <option key={room.Room_ID} value={room.Room_ID}>
                  {room.Name}
                </option>

              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="p-2 rounded bg-gray-800 text-white border border-gray-600"
              value={calendarView}
              onChange={(e) => changeView(e.target.value as CalendarViewType)}
            >
              <option value="dayGridMonth">Month</option>
              <option value="timeGridWeek">Week</option>
              <option value="listWeek">List</option>
            </select>
            <span className="text-white font-semibold">{currentDate}</span>
            <button onClick={goToPrev} className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600">←</button>
            <button onClick={goToNext} className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600">→</button>
          </div>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={calendarView}
          headerToolbar={false}
          selectable
          selectMirror
          unselectAuto={false}
          select={handleSelect}
          editable={false}
          eventClick={handleEventClick}
          events={filteredEvents}
          eventContent={({ event }) => {
            console.log(`[DEBUG] Rendering event ${event.id}:`, event);
            const status = event.extendedProps.status;
            const statusLabel = {
              APPROVED: 'Approved',
              PENDING: 'Pending',
              REJECTED: 'Rejected',
              CANCELLED: 'Cancelled'
            };
            const statusColor = {
              APPROVED: 'bg-green-600 text-white',
              PENDING: 'bg-yellow-500 text-black',
              REJECTED: 'bg-red-600 text-white',
              CANCELLED: 'bg-gray-400 text-white'
            };

            const timeText = event.start && event.end
              ? `${dayjs(event.start).format('HH:mm')}–${dayjs(event.end).format('HH:mm')}`
              : '';

            return (
              <div className="flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{event.title}</span>
                  <span className={`text-xs rounded px-1 ml-2 ${statusColor[status]}`}>
                    {statusLabel[status]}
                  </span>
                </div>
                <span className="text-xs">{timeText}</span>
                {event.extendedProps.description && (
                  <span className="text-xs italic truncate">{event.extendedProps.description}</span>
                )}
              </div>
            );
          }}

          slotMinTime="07:00:00"
          slotMaxTime="19:00:00"
          height="auto"
          datesSet={updateCurrentDate}
          dayHeaderFormat={calendarView === 'dayGridMonth' ? { weekday: 'short' } : { weekday: 'short', day: 'numeric' }}
        />
      </div>

      <div className="w-[320px] h-[calc(100vh-4rem)] flex flex-col border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md p-3">
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {showForm ? 'Close Form' : 'Add Schedule'}
          </button>
          <Calendar
            onChange={(date) => {
              const formatted = dayjs(date).format('YYYY-MM-DD');
              setFormData((prev) => ({ ...prev, startDate: formatted }));
              calendarRef.current?.getApi()?.gotoDate(formatted);
            }}
            value={formData.startDate ? new Date(formData.startDate) : new Date()}
          />
        </div>


        {showForm && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 border-t border-gray-300 dark:border-gray-700 flex flex-col gap-3">
            <Input label="Title" type="text" value={formData.title} onChange={(v) => setFormData({ ...formData, title: v })} required />
            <Input label="Description" isTextArea value={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} />
            <BorrowedItemSelect
              value={formData.borrowedItems}
              onChange={(v) => setFormData({ ...formData, borrowedItems: v })}
              disabledItems={events.filter(e => e.extendedProps.status === 'APPROVED' || e.extendedProps.status === 'PENDING')
                .filter(e =>
                  (formData.startDate === dayjs(e.start).format('YYYY-MM-DD')) &&
                  (formData.startTime < dayjs(e.end).format('HH:mm')) &&
                  (formData.endTime > dayjs(e.start).format('HH:mm'))
                )
                .flatMap(e => e.extendedProps.borrowedItems)
              }
            />
            <BorrowedItemAddControl
              onAdd={(id) => {
                if (!formData.borrowedItems.includes(id)) {
                  setFormData({ ...formData, borrowedItems: [...formData.borrowedItems, id] });
                }
              }}
              disabledItems={getDisabledItems()}
            />
            <DateTimeInputs formData={formData} setFormData={setFormData} />
            <RepeatInputs formData={formData} toggleRepeatDay={toggleRepeatDay} setFormData={setFormData} />
            <button type="submit" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">Add Booking</button>
          </form>
        )}


        {userRole === 'ADMIN' && (
          <div className="mt-4 px-3 overflow-y-auto max-h-[300px]">
            <h2 className="font-bold text-lg mb-2 text-white">Pending Requests</h2>
            {events
              .filter(e => e.extendedProps.status === 'PENDING')
              .map((e, idx) => (
                <div key={idx} className="border p-3 mb-3 rounded bg-gray-200 dark:bg-gray-700">
                  <p className="font-semibold text-base">{e.title}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {e.extendedProps.roomName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dayjs(e.start).format('MMM D, YYYY')} | {dayjs(e.start).format('HH:mm')}–{dayjs(e.end).format('HH:mm')}
                  </p>
                  {e.extendedProps.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">
                      {e.extendedProps.description}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded"
                      onClick={() => approveEvent(e)}
                    >
                      Approve
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded"
                      onClick={() => denyEvent(e)}
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
        <ReportIssueModal
          isOpen={showReportIssueModal}
          onClose={() => setShowReportIssueModal(false)}
          onSubmit={async (description, issueType, equipment) => {
            // TODO: Implement actual submission logic here
            console.log('Submitting issue:', { description, issueType, equipment });
          }}
          room={rooms.find(r => r.Room_ID === activeRoom)?.Name || ''}
          pcNumber="N/A"
        />
      </div>
    </div>

  );
}

function Input({ label, type = 'text', value, onChange, isTextArea = false, required }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{label}</label>
      {isTextArea ? (
        <textarea
          className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white resize-none"
          style={{ height: '72px' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </div>
  );
}

function DateTimeInputs({ formData, setFormData }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Start Date & Time</label>
      <input type="date" className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white mb-2" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
      <div className="flex gap-4">
        <input type="time" className="flex-1 p-2 rounded border dark:bg-gray-700 dark:text-white" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required />
        <input type="time" className="flex-1 p-2 rounded border dark:bg-gray-700 dark:text-white" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required />
      </div>
    </div>
  );
}

function RepeatInputs({ formData, toggleRepeatDay, setFormData }) {
  const handleRepeatToggle = (e) => {
    const checked = e.target.checked;
    const newRepeatDays = checked
      ? [DAY_INDEX_TO_CODE[dayjs(formData.startDate).day()]]
      : [];
    setFormData((prev) => ({
      ...prev,
      repeat: checked,
      repeatDays: newRepeatDays,
      endDate: checked ? prev.endDate : '',
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.repeat}
          onChange={handleRepeatToggle}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">Repeat Event</span>
      </div>

      {formData.repeat && (
        <>
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Repeats on:</label>
            <div className="grid grid-cols-4 gap-2">
              {DAY_INDEX_TO_CODE.map((day) => (
                <div key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.repeatDays.includes(day)}
                    onChange={() => toggleRepeatDay(day)}
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{day.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">End Date</label>
            <input
              type="date"
              className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>
        </>
      )}
    </div>
  );
}


