import Scheduling from '@/pages/scheduling/SchedulingPage';
import { ActiveRoomProvider } from '@/context/ActiveRoomContext';

const LabheadScheduling = () => {
  return (
    <ActiveRoomProvider storageScope="labhead">
      <div className="flex h-screen flex-col bg-[#f4f7fa] dark:bg-[#101828]">
        <Scheduling />
      </div>
    </ActiveRoomProvider>
  );
};

export default LabheadScheduling;
