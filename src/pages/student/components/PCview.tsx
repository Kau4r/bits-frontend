import Computer from "@/pages/student/components/Computer"
import type { Computer as ComputerType } from "@/services/computers"
import { getNumberedComputers } from "@/utils/computerDisplay";

interface PCviewProps {
    computers?: ComputerType[];
    roomName?: string;
}

export default function PCview({ computers = [], roomName }: PCviewProps) {
    const numberedComputers = getNumberedComputers(computers);

    if (computers.length === 0) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{roomName || 'Loading...'}</h2>
                <div className="text-gray-600 dark:text-gray-400 text-center py-10">
                    No computers found in this room.
                </div>
            </div>
        );
    }


    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{roomName}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {numberedComputers.map(({ computer: pc, displayName }) => (
                    <Computer
                        key={pc.Computer_ID}
                        pcLabel={displayName}
                        // Map API status to component status
                        status={
                            pc.Status === 'AVAILABLE' ? 'available' :
                                pc.Status === 'IN_USE' ? 'in-use' :
                                    pc.Status === 'MAINTENANCE' ? 'damaged' : 'available'
                        }
                        isActive={pc.Status === 'IN_USE'} // Simple active check
                    />
                ))}
            </div>
        </div>
    );
}
