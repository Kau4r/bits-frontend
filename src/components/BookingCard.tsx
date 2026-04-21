import { useState, useEffect } from 'react';
import { getBookings } from '@/services/booking';
import type { Booking, BookingStatus } from '@/types/booking';
import { Calendar } from 'lucide-react';
import Card from './Card';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const statusColors: Record<BookingStatus, string> = {
  APPROVED: 'text-green-600 dark:text-green-400',
  PENDING: 'text-yellow-600 dark:text-yellow-400',
  REJECTED: 'text-red-600 dark:text-red-400',
  CANCELLED: 'text-gray-500 dark:text-gray-400',
};

const statusDots: Record<BookingStatus, string> = {
  APPROVED: 'bg-green-500',
  PENDING: 'bg-yellow-500',
  REJECTED: 'bg-red-500',
  CANCELLED: 'bg-gray-400',
};

export default function BookingCard() {
  const { user } = useAuth();
  const isLabHead = user?.User_Role?.toUpperCase() === 'LAB_HEAD';
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
      <Card
        title={(
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            <span>{isLabHead ? 'Schedules' : 'Room Schedules'}</span>
          </span>
        )}
        className="h-full"
      >
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
              <div className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1.5" />
                <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={(
        <span className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          <span>{isLabHead ? 'Scheduling' : 'Room Schedule'}</span>
        </span>
      )}
      className="h-full"
      headerRight={
        isLabHead ? (
          pendingCount > 0 ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
              {pendingCount} pending
            </span>
          ) : undefined
        ) : (
          <Link
            to="/labtech/room"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View All
          </Link>
        )
      }
    >
      
      {bookings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No bookings yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1 pr-1 -mr-1">
          {bookings.map((booking) => (
            <div key={booking.Booked_Room_ID} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
              <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusDots[booking.Status] || 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {booking.Room?.Name || `Room ${booking.Room_ID}`}
                  </h4>
                  <span className={`text-xs font-medium ml-2 ${statusColors[booking.Status] || 'text-gray-400'}`}>
                    {booking.Status ? (booking.Status.charAt(0) + booking.Status.slice(1).toLowerCase()) : 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(booking.Start_Time)} &middot; {formatTime(booking.Start_Time, booking.End_Time)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
