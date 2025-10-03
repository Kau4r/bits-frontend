import Card from '@/components/dashboard/Card';
import OpenedLaboratories from '@/components/dashboard/OpenedLaboratories';
import FormsCard from '@/components/dashboard/FormsCard';
import NotificationsCard from '@/components/dashboard/NotificationsCard';
import ReportsCard from '@/components/dashboard/ReportsCard';

export default function LabtechDashboard() {
  return (
    <div className="h-screen w-full p-4 flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Good Day, Lab Technician
        </h1>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Side (2 columns wide) */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-0">
          {/* Top Row: Forms + Reports */}
          <div className="grid grid-cols-2 gap-4">
            <Card title="Forms" className="h-48">
              <FormsCard />
            </Card>
            <Card title="Reports" className="h-48">
              <ReportsCard />
            </Card>
          </div>

          {/* Bottom Row: Opened Laboratories - takes remaining space */}
          <div className="flex-1 min-h-0">
            <Card title="Opened Laboratories" className="h-full">
              <OpenedLaboratories />
            </Card>
          </div>
        </div>

        {/* Right Side: Notifications full height */}
        <div className="h-full min-h-0">
          <Card title="Notifications" className="h-full">
            <NotificationsCard />
          </Card>
        </div>
      </div>
    </div>
  );
}