import { Monitor } from 'lucide-react';

type ComputerProps = {
    pcNumber: number;
    status: 'available' | 'in-use' | 'active' | 'damaged';
    isActive?: boolean;
};

export default function Computer({ pcNumber, status = 'available', isActive = false }: ComputerProps) {
    const statusStyles = {
        available: 'text-green-500',
        'in-use': 'text-yellow-500',
        active: 'text-blue-500',
        damaged: 'text-red-500'
    };

    const statusText = {
        available: 'Available',
        'in-use': 'In Use',
        active: 'Active',
        damaged: 'Damaged'
    };

    return (
        <div
            className={`relative rounded-lg bg-gray-100 dark:bg-slate-800 p-4 flex flex-col items-center
            justify-center transition-all duration-200 min-h-[8rem] max-h-[8rem]
            ${isActive ? 'ring-2 ring-blue-500' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`}
        >

            <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${statusStyles[status]}`}></span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{statusText[status]}</span>
            </div>

            <div className="flex flex-col items-center pt-4 justify-center">
                <Monitor className={`w-8 h-8 ${statusStyles[status]}`} />
                <span className="text-gray-900 dark:text-white font-medium mt-2">PC {pcNumber}</span>
            </div>
        </div>
    );
}
