import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface FloatingComboboxOption {
  value: string;
  label: string;
}

interface FloatingComboboxProps {
  id: string;
  value: string;
  placeholder: string;
  options: FloatingComboboxOption[];
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

export function FloatingCombobox({
  id,
  value,
  placeholder,
  options,
  onChange,
  className = '',
  inputClassName = '',
  menuClassName = '',
  disabled = false,
  required = false,
}: FloatingComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [menuRect, setMenuRect] = useState({ left: 0, top: 0, width: 0 });

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  }, [options, value]);

  const updateMenuRect = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuRect({ left: rect.left, top: rect.bottom + 8, width: rect.width });
  };

  useEffect(() => {
    if (!isOpen) return;

    updateMenuRect();
    setActiveIndex(0);

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !wrapperRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updateMenuRect);
    window.addEventListener('scroll', updateMenuRect, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateMenuRect);
      window.removeEventListener('scroll', updateMenuRect, true);
    };
  }, [isOpen]);

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const chooseOption = (option: FloatingComboboxOption) => {
    onChange(option.value);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const moveActive = (nextIndex: number) => {
    if (filteredOptions.length === 0) return;
    const wrapped = (nextIndex + filteredOptions.length) % filteredOptions.length;
    setActiveIndex(wrapped);
  };

  return (
    <div ref={wrapperRef} className={className}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
            updateMenuRect();
          }}
          onFocus={() => {
            if (disabled) return;
            updateMenuRect();
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (disabled) return;

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              moveActive(activeIndex + 1);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
              moveActive(activeIndex - 1);
            } else if (event.key === 'Home' && isOpen) {
              event.preventDefault();
              setActiveIndex(0);
            } else if (event.key === 'End' && isOpen) {
              event.preventDefault();
              setActiveIndex(Math.max(filteredOptions.length - 1, 0));
            } else if (event.key === 'Enter' && isOpen && filteredOptions[activeIndex]) {
              event.preventDefault();
              chooseOption(filteredOptions[activeIndex]);
            } else if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-[#475569] dark:hover:bg-[#1e2939] dark:focus:border-[#615fff] dark:focus:ring-[#615fff]/20 ${inputClassName}`}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-menu`}
          aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        />
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          id={`${id}-menu`}
          data-floating-dropdown="true"
          className={`fixed z-[1200] max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/10 scrollbar-thin dark:border-[#334155] dark:bg-[#1e2939] dark:shadow-black/30 ${menuClassName}`}
          style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
          role="listbox"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <button
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                id={`${id}-option-${index}`}
                key={`${option.value}-${index}`}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${active
                  ? 'bg-slate-100 text-slate-950 dark:bg-white/10 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
                  } ${selected ? 'font-semibold' : ''}`}
                role="option"
                aria-selected={selected}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-indigo-500 dark:text-cyan-300" />}
              </button>
            );
          }) : (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No suggestions</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
