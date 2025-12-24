import { useState, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

export function ColumnFilterDropdown({
  columnKey,
  columnLabel,
  allValues,
  selectedValues,
  onApply,
  onSort,
  currentSort,
  isOpen,
  onClose,
  position,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState(new Set(selectedValues || []));
  const dropdownRef = useRef(null);

  // Get unique values from column
  const uniqueValues = useMemo(() => {
    const values = [...new Set(allValues.map(v => v ?? '(Blank)'))];
    return values.sort((a, b) => String(a).localeCompare(String(b)));
  }, [allValues]);

  // Filter values by search term
  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter(v =>
      String(v).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueValues, searchTerm]);

  // Check if all filtered values are selected
  const allFilteredSelected = filteredValues.length > 0 &&
    filteredValues.every(v => tempSelected.has(v));

  // Reset temp selection when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selectedValues || []));
      setSearchTerm('');
    }
  }, [isOpen, selectedValues]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered values
      const newSelected = new Set(tempSelected);
      filteredValues.forEach(v => newSelected.delete(v));
      setTempSelected(newSelected);
    } else {
      // Select all filtered values
      const newSelected = new Set(tempSelected);
      filteredValues.forEach(v => newSelected.add(v));
      setTempSelected(newSelected);
    }
  };

  const handleToggleValue = (value) => {
    const newSelected = new Set(tempSelected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setTempSelected(newSelected);
  };

  const handleApply = () => {
    // If all values are selected or none selected, clear the filter
    if (tempSelected.size === 0 || tempSelected.size === uniqueValues.length) {
      onApply(columnKey, null);
    } else {
      onApply(columnKey, tempSelected);
    }
    onClose();
  };

  const handleClearFilter = () => {
    setTempSelected(new Set(uniqueValues));
  };

  const handleSort = (direction) => {
    onSort(columnKey, direction);
    onClose();
  };

  if (!isOpen) return null;

  const isFiltered = selectedValues && selectedValues.size > 0 && selectedValues.size < uniqueValues.length;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl min-w-64 max-w-80 flex flex-col"
      style={{
        top: position?.top ?? '100%',
        left: position?.left ?? 0,
        maxHeight: '400px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sort Options */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2">
        <button
          onClick={() => handleSort('ascending')}
          className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer ${
            currentSort?.key === columnKey && currentSort?.direction === 'ascending'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          <span className="text-base">A</span>
          <span className="text-xs text-gray-400">&#8595;</span>
          <span className="text-base">Z</span>
          <span className="ml-2">Sort A to Z</span>
        </button>
        <button
          onClick={() => handleSort('descending')}
          className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer ${
            currentSort?.key === columnKey && currentSort?.direction === 'descending'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          <span className="text-base">Z</span>
          <span className="text-xs text-gray-400">&#8595;</span>
          <span className="text-base">A</span>
          <span className="ml-2">Sort Z to A</span>
        </button>
      </div>

      {/* Clear Filter */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2">
        <button
          onClick={handleClearFilter}
          disabled={!isFiltered}
          className={`w-full text-left px-3 py-1.5 text-sm rounded flex items-center gap-2 cursor-pointer ${
            isFiltered
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Clear Filter from "{columnLabel}"
        </button>
      </div>

      {/* Search Box */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {/* Checkbox List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {/* Select All */}
        <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
            (Select All)
          </span>
        </label>

        {/* Values */}
        {filteredValues.map((value, idx) => (
          <label
            key={idx}
            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={tempSelected.has(value)}
              onChange={() => handleToggleValue(value)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200 truncate" title={String(value)}>
              {String(value)}
            </span>
          </label>
        ))}

        {filteredValues.length === 0 && (
          <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
            No matches found
          </div>
        )}
      </div>

      {/* OK / Cancel Buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-2 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
}

ColumnFilterDropdown.propTypes = {
  columnKey: PropTypes.string.isRequired,
  columnLabel: PropTypes.string.isRequired,
  allValues: PropTypes.array.isRequired,
  selectedValues: PropTypes.instanceOf(Set),
  onApply: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  currentSort: PropTypes.shape({
    key: PropTypes.string,
    direction: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  position: PropTypes.shape({
    top: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    left: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
};
