import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    type = 'text',
    className = '',
    ...props
  },
  ref
) {
  const baseClasses = 'border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <input
      ref={ref}
      type={type}
      className={`${baseClasses} ${className}`}
      {...props}
    />
  );
});

export function FilterInput({ value, onChange, placeholder, onClick, className = '' }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className={`w-full mt-1 px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-500 font-normal text-gray-700 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 ${className}`}
      value={value}
      onClick={onClick}
      onChange={onChange}
    />
  );
}
