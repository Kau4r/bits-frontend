// Cleaned and refactored Scheduling component
import { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
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

const DAY_INDEX_TO_CODE = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];

const INITIAL_FORM = {
  title: '',
  description: '',
  startDate: '',
  startTime: '',
  endTime: '',
  repeat: false,
  repeatDays: ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'],
  endDate: '',
  borrowedItems: [], // fixed key and initialised as array
};


export const MOCK_ROOMS = [
  { id: 'room_a', name: 'LB465' },
  { id: 'room_b', name: 'LB466' },
  { id: 'room_c', name: 'LB467' },
  { id: 'room_d', name: 'LB468' },
];

const MOCK_ITEMS = Object.freeze([
  { id: 'item_a', name: 'Projector A' },
  { id: 'item_b', name: 'Laptop B' },
  { id: 'item_c', name: 'Microphone C' },
]);


export default function Scheduling() {

  const [userRole, setUserRole] = useState('faculty'); // mock for now
  const approveEvent = (event) => {
    setEvents(prev =>
      prev.map(e =>
        e === event ? { ...e, extendedProps: { ...e.extendedProps, status: 'approved' } } : e
      )
    );
  };

  const buildEvent = (start, end) => ({
    title: formData.title,
    start,
    end,
    color: '#306844',
    extendedProps: {
      description: formData.description,
      roomId: activeRoom,
      roomName: MOCK_ROOMS.find(r => r.id === activeRoom)?.name || 'Unknown',
      borrowedItems: formData.borrowedItems.map(id => {
        const item = MOCK_ITEMS.find(i => i.id === id);
        return { id: item?.id || '', name: item?.name || '' };
      }),
      status: 'pending',
      createdBy: userRole,
    },
  });

  const denyEvent = (event) => {
    setEvents(prev => prev.filter(e => e !== event));
  };

  const calendarRef = useRef(null);
  const [calendarView, setCalendarView] = useState('timeGridWeek');
  const [currentDate, setCurrentDate] = useState(dayjs().format('MMMM YYYY'));
  const [events, setEvents] = useState([
    {
      title: 'Class in LB483',
      start: '2025-08-06T09:00',
      end: '2025-08-06T11:00',
      extendedProps: {
        roomId: 'room_a',
        roomName: 'LB483',
        status: 'approved',
        createdBy: userRole
      }
    },
    {
      title: 'Class in LB483',
      start: '2025-08-06T13:00',
      end: '2025-08-06T15:00',
      extendedProps: {
        roomId: 'room_a',
        roomName: 'LB483',
        status: 'approved',
        createdBy: userRole
      }
    },
    {
      title: 'Class in CNF2',
      start: '2025-08-06T08:00',
      end: '2025-08-06T10:00',
      extendedProps: {
        roomId: 'room_b',
        roomName: 'CNF2',
        status: 'approved',
        createdBy: userRole
      }
    },
    {
      title: 'Class in CTL1',
      start: '2025-08-06T10:00',
      end: '2025-08-06T12:00',
      extendedProps: {
        roomId: 'room_c',
        roomName: 'CTL1',
        status: 'approved',
        createdBy: userRole
      }
    }
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [activeRoom, setActiveRoom] = useState('room_a');
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);


  function BorrowedItemSelect({ value, onChange, disabledItems }) {
    return (
      <div>
        <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Borrow Items</label>
        <ul className="space-y-2">
          {value.map((itemId, idx) => {
            const item = MOCK_ITEMS.find(i => i.id === itemId);
            return (
              <li key={idx} className="flex justify-between items-center bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                <span>{item?.name || itemId}</span>
                <button type="button" className="text-red-500" onClick={() => onChange(value.filter((_, i) => i !== idx))}>Remove</button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  function BorrowedItemAddControl({ onAdd, disabledItems }) {
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
              const select = document.getElementById('borrow-item-select');
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
    const date = calendarRef.current?.getApi()?.getDate();
    if (date) setCurrentDate(dayjs(date).format('MMMM YYYY'));
  };

  const changeView = (viewType) => {
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

  const handleSelect = ({ start, end }) => {
    setFormData((prev) => ({
      ...INITIAL_FORM, // reset everything
      startDate: dayjs(start).format('YYYY-MM-DD'),
      startTime: dayjs(start).format('HH:mm'),
      endTime: dayjs(end).format('HH:mm'),
    }));
    setShowForm(true);
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    const { startDate, startTime, endTime, repeat, endDate, repeatDays } = formData;

    if (!startDate || !startTime || !endTime) {
      alert('Missing required fields.');
      return;
    }

    if (repeat && (!endDate || dayjs(endDate).isBefore(startDate) || repeatDays.length === 0)) {
      alert('Invalid repeat setup.');
      return;
    }

    const newEvents = [];
    const baseStart = `${startDate}T${startTime}`;
    const baseEnd = `${startDate}T${endTime}`;

    if (!repeat) {
      newEvents.push(buildEvent(baseStart, baseEnd));
    } else {
      const dedupedDays = [...new Set(repeatDays)];
      console.log('repeatDays:', dedupedDays); // <-- Log here

      let current = dayjs(startDate);
      const until = dayjs(endDate);

      while (current.isSameOrBefore(until, 'day')) {
        const currentDayCode = DAY_INDEX_TO_CODE[current.day()];
        if (dedupedDays.includes(currentDayCode)) {
          const eventStart = `${current.format('YYYY-MM-DD')}T${startTime}`;
          const eventEnd = `${current.format('YYYY-MM-DD')}T${endTime}`;
          newEvents.push(buildEvent(eventStart, eventEnd));
          console.log('Checking:', current.format('YYYY-MM-DD'), '=>', currentDayCode);
        }
        current = current.add(1, 'day');
      }
    }

    console.log('Generated Events:', newEvents); // <-- Log here

    setEvents((prev) => [...prev, ...newEvents]);
    setFormData(INITIAL_FORM);
  };

  const toggleRepeatDay = (day) => {
    setFormData((prev) => {
      const days = [...prev.repeatDays];
      const i = days.indexOf(day);
      if (i >= 0) days.splice(i, 1);
      else days.push(day);
      return { ...prev, repeatDays: days };
    });
  };

  const handleEventClick = ({ event }) => {
    const start = dayjs(event.start);
    const end = dayjs(event.end);

    setFormData({
      title: event.title,
      description: event.extendedProps.description || '',
      startDate: start.format('YYYY-MM-DD'),
      startTime: start.format('HH:mm'),
      endTime: end.format('HH:mm'),
      repeat: false,          // optional: disable repeat for edits
      repeatDays: [],         // optional: clear repeats
      endDate: '',            // optional: clear repeats
    });

    setShowForm(true);
  };


  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="flex-grow p-6">
        <div className="flex justify-between mb-4 relative">
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
              onChange={(e) => setActiveRoom(e.target.value)}
            >
              {MOCK_ROOMS.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="p-2 rounded bg-gray-800 text-white border border-gray-600"
              value={calendarView}
              onChange={(e) => changeView(e.target.value)}
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
          events={events.filter(e =>
            e.extendedProps.roomId === activeRoom &&
            (
              userRole === 'admin' ||
              e.extendedProps.status === 'approved' ||
              (e.extendedProps.status === 'pending' && e.extendedProps.createdBy === userRole)
            )
          )}

          eventContent={({ event }) => {
            const status = event.extendedProps.status;
            const statusLabel = {
              approved: 'Approved',
              pending: 'Pending',
            };

            const statusColor = {
              approved: 'bg-green-600 text-white',
              pending: 'bg-yellow-500 text-black',
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

      <div className="w-[320px] h-screen flex flex-col border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md p-3">
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
              disabledItems={events.filter(e => e.extendedProps.status === 'approved' || e.extendedProps.status === 'pending')
                .filter(e =>
                  (formData.startDate === dayjs(e.start).format('YYYY-MM-DD')) &&
                  (formData.startTime < dayjs(e.end).format('HH:mm')) &&
                  (formData.endTime > dayjs(e.start).format('HH:mm'))
                )
                .flatMap(e => e.extendedProps.borrowedItems.map(b => b.id))
              }
            />
            <BorrowedItemAddControl
              onAdd={(id) => {
                if (!formData.borrowedItems.includes(id)) {
                  setFormData({ ...formData, borrowedItems: [...formData.borrowedItems, id] });
                }
              }}
              disabledItems={events.filter(e => e.extendedProps.status === 'approved' || e.extendedProps.status === 'pending')
                .filter(e =>
                  (formData.startDate === dayjs(e.start).format('YYYY-MM-DD')) &&
                  (formData.startTime < dayjs(e.end).format('HH:mm')) &&
                  (formData.endTime > dayjs(e.start).format('HH:mm'))
                )
                .flatMap(e => e.extendedProps.borrowedItems.map(b => b.id))
              }
            />
            <DateTimeInputs formData={formData} setFormData={setFormData} />
            <RepeatInputs formData={formData} toggleRepeatDay={toggleRepeatDay} setFormData={setFormData} />
            <button type="submit" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">Add Booking</button>
          </form>
        )}


        {userRole === 'admin' && (
          <div className="mt-4 px-3 overflow-y-auto max-h-[300px]">
            <h2 className="font-bold text-lg mb-2 text-white">Pending Requests</h2>
            {events
              .filter(e => e.extendedProps.status === 'pending')
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
          room={MOCK_ROOMS.find(r => r.id === activeRoom)?.name || ''}
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


