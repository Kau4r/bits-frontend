import { FaDesktop } from 'react-icons/fa';

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
        <div className={`relative rounded-lg bg-slate-800 p-4 flex flex-col items-center justify-center h-32 transition-all duration-200 
            ${isActive ? 'ring-2 ring-blue-500' : 'hover:bg-slate-700'}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${statusStyles[status]}`}></span>
                <span className="text-xs text-gray-400">{statusText[status]}</span>
            </div>
            <div className="flex flex-col items-center">
                <FaDesktop className={`w-8 h-8 ${statusStyles[status]}`} />
                <span className="text-white font-medium mt-2">PC {pcNumber}</span>
            </div>
        </div>
    );
}