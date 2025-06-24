import Card from '@/components/dashboard/Card';
import OpenedLaboratories from '@/components/dashboard/OpenedLaboratories';
import FormsCard from '@/components/dashboard/FormsCard';
import NotificationsCard from '@/components/dashboard/NotificationsCard';
import ReportsCard from '@/components/dashboard/ReportsCard';

export default function LabtechDashboard() {
  return (
    <div className="h-screen w-full p-2 sm:p-3 md:p-4 flex flex-col overflow-hidden">
      <div className='mb-2 sm:mb-3 md:mb-4 flex-shrink-0'>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">GOOD DAY LABTECH</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-rows-4 sm:grid-rows-2 lg:grid-cols-3 lg:grid-rows-1 gap-2 sm:gap-3 md:gap-4 min-h-min">
          <div className="lg:col-span-2">
            <Card title="Opened Laboratories" className="h-full">
              <OpenedLaboratories />
            </Card>
          </div>
          <div className="row-span-3 lg:row-span-1">
            <Card title="Notifications" className="h-full">
              <NotificationsCard />
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card title="Forms" className="h-full">
              <FormsCard />
            </Card>
          </div>
          <div className="lg:col-start-3">
            <Card title="Reports" className="h-full">
              <ReportsCard />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}