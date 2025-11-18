'use client';

import { memo } from 'react';

// komponen toggle switch yang dapat digunakan kembali dengan akselerasi GPU
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ToggleSwitch = memo(function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
}: ToggleSwitchProps) {
  // ukuran toggle berdasarkan prop size
  const sizeClasses = {
    sm: {
      track: 'w-9 h-5',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'h-6 w-6',
      translate: 'translate-x-7',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex items-center shrink-0 cursor-pointer rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${currentSize.track}
        ${checked ? 'bg-indigo-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        transform-gpu will-change-transform
      `}
    >
      <span
        aria-hidden="true"
        className={`
          pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0
          transition-transform duration-200 ease-in-out
          transform-gpu will-change-transform
          ${currentSize.thumb}
          ${checked ? currentSize.translate : 'translate-x-0.5'}
        `}
      />
    </button>
  );
});

export default ToggleSwitch;
