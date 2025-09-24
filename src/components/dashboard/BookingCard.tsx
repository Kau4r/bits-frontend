  
interface BookingItem {
  id: number;
  title: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

const bookings: BookingItem[] = [
  { id: 1, title: 'Computer Lab 1', date: '2023-09-22', time: '09:00 - 11:00', status: 'confirmed' },
  { id: 2, title: 'Design Studio', date: '2023-09-22', time: '13:00 - 15:00', status: 'pending' },
  { id: 3, title: 'Computer Lab 2', date: '2023-09-23', time: '10:00 - 12:00', status: 'confirmed' },
  { id: 4, title: 'Multimedia Lab', date: '2023-09-23', time: '14:00 - 16:00', status: 'cancelled' },
  { id: 5, title: 'Computer Lab 3', date: '2023-09-24', time: '11:00 - 13:00', status: 'pending' },
  { id: 6, title: 'Research Lab', date: '2023-09-24', time: '15:00 - 17:00', status: 'confirmed' },
  { id: 7, title: 'Computer Lab 1', date: '2023-09-25', time: '09:00 - 11:00', status: 'pending' },
  { id: 8, title: 'Design Studio', date: '2023-09-25', time: '13:00 - 15:00', status: 'confirmed' },
];

const statusColors = {
  confirmed: 'text-green-400',
  pending: 'text-yellow-400',
  cancelled: 'text-red-400',
};

export default function BookingCard() {
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Recent Bookings</h3>
        {pendingCount > 0 && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
            {pendingCount} pending approval
          </span>
        )}
      </div>
      
      <div className="space-y-2 overflow-y-auto flex-1 pr-2 -mr-2">
        {bookings.map(({ id, title, date, time, status }) => (
          <div key={id} className="p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-blue-500/10 rounded-lg">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">{title}</h4>
                  <p className="text-xs text-gray-400">{date} • {time}</p>
                  <div className={`text-xs mt-1 ${statusColors[status]}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                </div>
              </div>
              <button className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
