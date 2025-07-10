import { FaGithub, FaYoutube, FaPlus } from 'react-icons/fa';
import { SiGmail, SiCanvas, SiCodechef } from 'react-icons/si';
import { BsBook, BsBuilding } from 'react-icons/bs';

export default function Shortcuts() {
    const shortcuts = [
        
        { name: 'Gmail', icon: <SiGmail className="text-red-400" size={24} />, bg: 'bg-red-900/30 hover:bg-red-800/50' },
        { name: 'Canvas', icon: <SiCanvas className="text-orange-400" size={24} />, bg: 'bg-orange-900/30 hover:bg-orange-800/50' },
        { name: 'Youtube', icon: <FaYoutube className="text-red-500" size={24} />, bg: 'bg-red-900/30 hover:bg-red-800/50' },
        { name: 'CodeChum', icon: <SiCodechef className="text-green-400" size={24} />, bg: 'bg-green-900/30 hover:bg-green-800/50' },
        { name: 'USC Library', icon: <BsBook className="text-purple-400" size={24} />, bg: 'bg-purple-900/30 hover:bg-purple-800/50' },
        { name: 'ISMIS', icon: <BsBuilding className="text-blue-400" size={24} />, bg: 'bg-blue-900/30 hover:bg-blue-800/50' },
        { name: 'Github', icon: <FaGithub className="text-gray-200" size={24} />, bg: 'bg-gray-800 hover:bg-gray-700' },
        { name: 'Add Shortcut', icon: <FaPlus className="text-gray-400" size={20} />, bg: 'bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600' },
    ];

    return (
        <div className="p-6 bg-slate-800 rounded-xl shadow-sm border border-slate-700"> 
            <h2 className="text-xl font-semibold text-gray-200 mb-6">Quick Access</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {shortcuts.map((shortcut, index) => (
                    <div key={index} className="group flex flex-col items-center">
                        <div 
                            className={`w-16 h-16 ${shortcut.bg} rounded-xl flex items-center justify-center mb-2 
                            transition-all duration-200 transform group-hover:-translate-y-1 cursor-pointer
                            border border-slate-700`}
                        >
                            {shortcut.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-300 text-center">
                            {shortcut.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}