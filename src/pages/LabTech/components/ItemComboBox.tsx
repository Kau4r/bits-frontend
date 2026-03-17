import { useState, useRef, useEffect } from "react";

interface ComboBoxProps {
    label: string;
    value: string;
    options: string[];
    onChange: (val: string) => void;
    onRemove: (val: string) => void;
    readOnly?: boolean;
}

export function ComboBox({ label, value, options, onChange, onRemove, readOnly }: ComboBoxProps) {
    const [inputValue, setInputValue] = useState(value || "");
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    // Sync internal state with external value prop
    useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    const handleSelect = (opt: string) => {
        setInputValue(opt);
        onChange(opt);
        setOpen(false);
    };

    const handleAdd = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        if (!options.includes(trimmed)) {
            onChange(trimmed);
        }
        setOpen(false);
    };

    // Close dropdown when clicked outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) return;

        const filteredOptions = inputValue.trim()
            ? [...options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()))]
            : options;

        // Add option
        if (inputValue.trim() && !options.includes(inputValue.trim())) {
            filteredOptions.unshift(inputValue.trim());
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const selected = filteredOptions[highlightedIndex];
            if (selected === inputValue.trim() && !options.includes(selected)) {
                handleAdd();
            } else {
                handleSelect(selected);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const displayedOptions = inputValue.trim()
        ? [...options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()))]
        : options;

    if (inputValue.trim() && !options.includes(inputValue.trim())) {
        displayedOptions.unshift(inputValue.trim());
    }

    return (
        <div className="flex flex-col relative" ref={containerRef}>
            <label className="mb-1 text-sm font-medium text-gray-900 dark:text-white">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    readOnly={readOnly}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        // Also update parent state as user types
                        onChange(e.target.value);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Select or add ${label.toLowerCase()}...`}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                    type="button"
                    onClick={() => onRemove(value)}
                    disabled={!value || readOnly}
                    className={`rounded px-2 py-1 ${value && !readOnly
                        ? "bg-red-600 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                        }`}
                >
                    Delete
                </button>
            </div>

            {open && !readOnly && (
                <div className="absolute top-full left-0 mt-1 max-h-40 w-full overflow-y-auto rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-10">
                    {displayedOptions.map((opt, idx) => {
                        const isAddNew = opt === inputValue.trim() && !options.includes(opt);
                        return (
                            <div
                                key={opt}
                                onClick={() => isAddNew ? handleAdd() : handleSelect(opt)}
                                className={`px-3 py-1 cursor-pointer text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${highlightedIndex === idx ? "bg-gray-200 dark:bg-gray-700" : ""
                                    } ${isAddNew ? "text-blue-600 dark:text-blue-400" : ""}`}
                            >
                                {isAddNew ? `+ Add "${opt}"` : opt}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
