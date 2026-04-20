import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link2, Plus } from 'lucide-react';

interface AddShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShortcut: (name: string, url: string) => void;
}

export default function AddShortcutModal({ isOpen, onClose, onAddShortcut }: AddShortcutModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name && url) {
      onAddShortcut(name, url);
      setName('');
      setUrl('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Shortcut</h2>
          <button
            onClick={onClose}
            className="text-3xl text-gray-500 hover:text-black dark:hover:text-white"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                placeholder="e.g., Google Drive"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                placeholder="https://example.com"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Shortcut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
