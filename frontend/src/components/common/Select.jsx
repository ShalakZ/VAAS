import { forwardRef } from 'react';

export const Select = forwardRef(function Select(
  {
    options = [],
    value,
    onChange,
    disabled = false,
    placeholder = 'Select...',
    className = '',
    highlight = false,
    ...props
  },
  ref
) {
  const baseClasses = 'border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const highlightClasses = highlight ? 'border-yellow-400 dark:border-yellow-600' : 'border-gray-300 dark:border-gray-600';
  const disabledClasses = disabled ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <select
      ref={ref}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`${baseClasses} ${highlightClasses} ${disabledClasses} ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        return (
          <option key={optValue} value={optValue}>
            {optLabel}
          </option>
        );
      })}
    </select>
  );
});
