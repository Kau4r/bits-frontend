import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface FloatingSelectOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface FloatingSelectProps<T extends string | number> {
  id: string;
  value: T | '';
  placeholder: string;
  options: FloatingSelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export function FloatingSelect<T extends string | number>({
  id,
  value,
  placeholder,
  options,
  onChange,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  disabled = false,
}: FloatingSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [menuRect, setMenuRect] = useState({ left: 0, top: 0, width: 0 });
  const selectedOption = options.find(option => option.value === value);
  const enabledOptions = options.filter(option => !option.disabled);

  const updateMenuRect = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMenuRect({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updateMenuRect();
    const selectedIndex = options.findIndex(option => option.value === value && !option.disabled);
    const firstEnabledIndex = options.findIndex(option => !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabledIndex, 0));

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !buttonRef.current?.contains(target)
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
  }, [isOpen, options, value]);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const moveActive = (direction: 1 | -1) => {
    if (enabledOptions.length === 0) return;

    let nextIndex = activeIndex;
    do {
      nextIndex = (nextIndex + direction + options.length) % options.length;
    } while (options[nextIndex]?.disabled);

    setActiveIndex(nextIndex);
  };

  const chooseOption = (option: FloatingSelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          updateMenuRect();
          setIsOpen(open => !open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!isOpen) {
              updateMenuRect();
              setIsOpen(true);
              return;
            }
            moveActive(1);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) {
              updateMenuRect();
              setIsOpen(true);
              return;
            }
            moveActive(-1);
          } else if (event.key === 'Home' && isOpen) {
            event.preventDefault();
            const firstEnabled = options.findIndex(option => !option.disabled);
            if (firstEnabled >= 0) setActiveIndex(firstEnabled);
          } else if (event.key === 'End' && isOpen) {
            event.preventDefault();
            const lastEnabled = [...options].map((option, index) => ({ option, index })).reverse().find(({ option }) => !option.disabled);
            if (lastEnabled) setActiveIndex(lastEnabled.index);
          } else if ((event.key === 'Enter' || event.key === ' ') && isOpen && options[activeIndex]) {
            event.preventDefault();
            chooseOption(options[activeIndex]);
          } else if ((event.key === 'Enter' || event.key === ' ') && !isOpen) {
            event.preventDefault();
            updateMenuRect();
            setIsOpen(true);
          } else if (event.key === 'Escape') {
            event.stopPropagation();
            setIsOpen(false);
          }
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 hover:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20 ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        aria-activedescendant={isOpen && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
      >
        <span className={selectedOption ? 'truncate' : 'truncate text-slate-400 dark:text-slate-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          id={`${id}-menu`}
          className={`fixed z-[1200] max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/10 scrollbar-thin dark:border-white/10 dark:bg-[#252d38] dark:shadow-black/30 ${menuClassName}`}
          style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
          role="listbox"
          aria-labelledby={id}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <button
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                id={`${id}-option-${index}`}
                key={String(option.value)}
                type="button"
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${selected
                  ? 'bg-slate-100 font-semibold text-slate-950 dark:bg-white/10 dark:text-white'
                  : active
                    ? 'bg-slate-50 text-slate-950 dark:bg-white/[0.07] dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
                  }`}
                role="option"
                aria-selected={selected}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-indigo-500 dark:text-cyan-300" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
