'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// komponen select dropdown dengan akselerasi GPU untuk performa optimal
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const Select = memo(function Select({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi',
  disabled = false,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // cari label dari value yang dipilih
  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 bg-white border border-gray-200 rounded-xl
          text-left text-gray-900 outline-none
          focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
          transition-all duration-200 ease-out
          flex items-center justify-between
          transform-gpu will-change-transform
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300 cursor-pointer'}
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`
            w-5 h-5 text-gray-400 transition-transform duration-200
            transform-gpu will-change-transform
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>

      {/* dropdown menu */}
      {isOpen && (
        <div
          className="
            absolute z-50 w-full mt-2 bg-white border border-gray-200
            rounded-xl shadow-lg overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
            transform-gpu will-change-transform
          "
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-4 py-3 text-left flex items-center justify-between
                  transition-colors duration-150
                  ${option.value === value
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check className="w-4 h-4 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default Select;
