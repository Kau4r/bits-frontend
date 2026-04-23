import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';

interface InventoryItem {
    Item_ID: number;
    Item_Code: string;
    Item_Type: string;
    Brand: string | null;
    Serial_Number: string | null;
    Status: string;
}

interface InventoryItemComboboxProps {
    itemType: 'KEYBOARD' | 'MOUSE' | 'MONITOR' | 'MINI_PC';
    value: InventoryItem | null;
    onChange: (item: InventoryItem | null) => void;
    placeholder?: string;
    label: string;
}

export default function InventoryItemCombobox({
    itemType,
    value,
    onChange,
    placeholder = 'Type to search...',
    label
}: InventoryItemComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const comboboxRef = useRef<HTMLDivElement>(null);

    // Fetch available items when component mounts or itemType changes
    useEffect(() => {
        loadAvailableItems();
    }, [itemType]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadAvailableItems = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get<InventoryItem[] | { items: InventoryItem[] }>(
                `/inventory/available?type=${itemType}&status=AVAILABLE`
            );
            const availableItems = Array.isArray(response.data)
                ? response.data
                : response.data.items || [];
            setItems(availableItems);
        } catch (err) {
            console.error('Failed to load available items:', err);
            setError('Failed to load items');
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        const searchLower = search.toLowerCase();
        return (
            item.Brand?.toLowerCase().includes(searchLower) ||
            item.Serial_Number?.toLowerCase().includes(searchLower) ||
            item.Item_Code.toLowerCase().includes(searchLower)
        );
    });

    const handleSelect = (item: InventoryItem) => {
        onChange(item);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = () => {
        onChange(null);
        setSearch('');
    };

    const displayValue = value
        ? `${value.Brand || 'N/A'} - ${value.Serial_Number || value.Item_Code}`
        : '';

    return (
        <div ref={comboboxRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {label}
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-left text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white dark:placeholder-gray-500"
                >
                    <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                        {displayValue || placeholder}
                    </span>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Clear selection"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-10 mt-2 flex max-h-64 w-full flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg dark:border-[#334155] dark:bg-[#1e2939]">
                    {/* Search Input */}
                    <div className="border-b border-gray-200 p-2 dark:border-[#334155]">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by brand, serial, or code..."
                            className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white dark:placeholder-gray-500"
                            autoFocus
                        />
                    </div>

                    {/* Items List */}
                    <div className="overflow-y-auto flex-1">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-600 dark:text-gray-500 text-sm">
                                Loading...
                            </div>
                        ) : error ? (
                            <div className="p-4 text-center text-red-500 text-sm">
                                {error}
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-4 text-center text-gray-600 dark:text-gray-500 text-sm">
                                {search ? 'No items match your search' : 'No available items'}
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <button
                                    key={item.Item_ID}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className="w-full border-b border-gray-200 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-100 dark:border-[#334155] dark:hover:bg-white/[0.07]"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {item.Brand || 'Unknown Brand'}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                S/N: {item.Serial_Number || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                            {item.Item_Code}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
