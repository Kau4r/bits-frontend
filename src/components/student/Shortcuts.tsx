import React from 'react';
import { useState } from 'react';
import { FaGithub, FaYoutube, FaPlus } from 'react-icons/fa';
import { SiGmail, SiCanvas, SiCodechef } from 'react-icons/si';
import { BsBook, BsBuilding } from 'react-icons/bs';
import AddShortcutModal from './Modals/AddShortcut';

type JSXElement = React.ReactElement;

interface Shortcut {
  id: number;
  name: string;
  icon: JSXElement;
  bg: string;
  url: string;
}

export default function Shortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([
    { id: 1, name: 'Gmail', icon: <SiGmail className="text-red-400" size={24} />, bg: 'bg-red-900/30 hover:bg-red-800/50', url: 'https://mail.google.com' },
    { id: 2, name: 'Canvas', icon: <SiCanvas className="text-orange-400" size={24} />, bg: 'bg-orange-900/30 hover:bg-orange-800/50', url: 'https://usc.instructure.com' },
    { id: 3, name: 'Youtube', icon: <FaYoutube className="text-red-500" size={24} />, bg: 'bg-red-900/30 hover:bg-red-800/50', url: 'https://www.youtube.com' },
    { id: 4, name: 'CodeChum', icon: <SiCodechef className="text-green-400" size={24} />, bg: 'bg-green-900/30 hover:bg-green-800/50', url: 'https://www.codechum.com' },
    { id: 5, name: 'USC Library', icon: <BsBook className="text-purple-400" size={24} />, bg: 'bg-purple-900/30 hover:bg-purple-800/50', url: 'https://library.usc.edu' },
    { id: 6, name: 'ISMIS', icon: <BsBuilding className="text-blue-400" size={24} />, bg: 'bg-blue-900/30 hover:bg-blue-800/50', url: 'https://ismis.usc.edu.ph/Account/Login?ReturnUrl=%2F' },
    { id: 7, name: 'Github', icon: <FaGithub className="text-gray-200" size={24} />, bg: 'bg-gray-800 hover:bg-gray-700', url: 'https://github.com' },
  ]);
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);

  const handleAddShortcut = (name: string, url: string) => {
    const newShortcut: Shortcut = {
      id: Date.now(),
      name,
      icon: <FaPlus className="text-gray-400" size={20} />,
      bg: 'bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600',
      url: url.startsWith('http') ? url : `https://${url}`,
    };
    setShortcuts([...shortcuts, newShortcut]);
  };

  const handleShortcutClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 bg-slate-800 rounded-xl shadow-sm border border-slate-700"> 
      <h2 className="text-xl font-semibold text-gray-200 mb-6">Quick Access</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.id} className="group flex flex-col items-center">
            <div 
              className={`w-16 h-16 ${shortcut.bg} rounded-xl flex items-center justify-center mb-2 
              transition-all duration-200 transform group-hover:-translate-y-1 cursor-pointer
              border border-slate-700`}
              onClick={() => handleShortcutClick(shortcut.url)}
            >
              {shortcut.icon}
            </div>
            <span className="text-sm font-medium text-gray-300 text-center">
              {shortcut.name}
            </span>
          </div>
        ))}
        {/* Add Shortcut Button */}
        <div className="group flex flex-col items-center">
          <div 
            className="w-16 h-16 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center mb-2 
            transition-all duration-200 transform group-hover:-translate-y-1 cursor-pointer
            border-2 border-dashed border-slate-600"
            onClick={() => setIsAddShortcutOpen(true)}
          >
            <FaPlus className="text-gray-400" size={20} />
          </div>
          <span className="text-sm font-medium text-gray-300 text-center">
            Add Shortcut
          </span>
        </div>
      </div>

      <AddShortcutModal
        isOpen={isAddShortcutOpen}
        onClose={() => setIsAddShortcutOpen(false)}
        onAddShortcut={handleAddShortcut}
      />
    </div>
  );
}