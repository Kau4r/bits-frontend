import { useState, useEffect } from 'react';
import { getBookings } from '@/services/booking';
import type { Booking, BookingStatus } from '@/types/booking';
import { CalendarIcon } from '@heroicons/react/24/outline';

const statusColors: Record<BookingStatus, string> = {
  APPROVED: 'text-green-400',
  PENDING: 'text-yellow-400',
  REJECTED: 'text-red-400',
  CANCELLED: 'text-gray-400',
};

export default function BookingCard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await getBookings();
        // Show most recent bookings first, limit to 8
        const sorted = data
          .sort((a, b) => new Date(b.Created_At).getTime() - new Date(a.Created_At).getTime())
          .slice(0, 50);
        setBookings(sorted);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const pendingCount = bookings.filter(b => b.Status === 'PENDING').length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (start: string, end: string) => {
    const startTime = new Date(start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${startTime} - ${endTime}`;
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-700 rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-gray-700/30 rounded-lg animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 bg-gray-700 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

      {bookings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No bookings yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pr-2 -mr-2">
          {bookings.map((booking) => (
            <div key={booking.Booked_Room_ID} className="p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 p-2 bg-blue-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">
                      {booking.Room?.Name || `Room ${booking.Room_ID}`}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {formatDate(booking.Start_Time)} • {formatTime(booking.Start_Time, booking.End_Time)}
                    </p>
                    <div className={`text-xs mt-1 ${statusColors[booking.Status] || 'text-gray-400'}`}>
                      {booking.Status ? (booking.Status.charAt(0) + booking.Status.slice(1).toLowerCase()) : 'Unknown'}
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
      )}
    </div>
  );
}
