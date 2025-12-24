import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  const [size, setSize] = useState({ width: 280, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

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

  // Reset temp selection and position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selectedValues || []));
      setSearchTerm('');
      setAdjustedPosition({ top: 0, left: 0 });
    }
  }, [isOpen, selectedValues]);

  // Adjust position to stay within viewport (runs once after initial render)
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    // Use a small timeout to ensure the dropdown is rendered
    const timer = setTimeout(() => {
      const dropdown = dropdownRef.current;
      if (!dropdown) return;

      const rect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 10;

      let offsetLeft = 0;
      let offsetTop = 0;

      // Check right edge overflow - shift left
      if (rect.right > viewportWidth - padding) {
        offsetLeft = viewportWidth - padding - rect.right;
      }

      // Check left edge overflow - shift right
      if (rect.left + offsetLeft < padding) {
        offsetLeft = padding - rect.left;
      }

      // Check bottom edge overflow - shift up
      if (rect.bottom > viewportHeight - padding) {
        offsetTop = viewportHeight - padding - rect.bottom;
      }

      // Check top edge overflow - shift down
      if (rect.top + offsetTop < padding) {
        offsetTop = padding - rect.top;
      }

      if (offsetLeft !== 0 || offsetTop !== 0) {
        setAdjustedPosition({ top: offsetTop, left: offsetLeft });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen]); // Only run when dropdown opens

  // Recalculate position on window resize
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowResize = () => {
      const dropdown = dropdownRef.current;
      if (!dropdown) return;

      const rect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 10;

      let offsetLeft = adjustedPosition.left;
      let offsetTop = adjustedPosition.top;

      // Check right edge overflow
      if (rect.right > viewportWidth - padding) {
        offsetLeft = adjustedPosition.left + (viewportWidth - padding - rect.right);
      }

      // Check bottom edge overflow
      if (rect.bottom > viewportHeight - padding) {
        offsetTop = adjustedPosition.top + (viewportHeight - padding - rect.bottom);
      }

      if (offsetLeft !== adjustedPosition.left || offsetTop !== adjustedPosition.top) {
        setAdjustedPosition({ top: offsetTop, left: offsetLeft });
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isOpen, adjustedPosition]);

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

  // Resize handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  }, [size]);

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const deltaX = e.clientX - resizeRef.current.startX;
      const deltaY = e.clientY - resizeRef.current.startY;

      // Calculate max size based on viewport and current position
      const dropdown = dropdownRef.current;
      const rect = dropdown?.getBoundingClientRect();
      const maxWidth = rect ? Math.min(750, window.innerWidth - rect.left - 10) : 750;
      const maxHeight = rect ? Math.min(600, window.innerHeight - rect.top - 10) : 600;

      setSize({
        width: Math.max(200, Math.min(maxWidth, resizeRef.current.startWidth + deltaX)),
        height: Math.max(350, Math.min(maxHeight, resizeRef.current.startHeight + deltaY)),
      });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

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

  // Calculate initial style with position adjustments
  const dropdownStyle = {
    top: `calc(${position?.top ?? '100%'} + ${adjustedPosition.top}px)`,
    left: (position?.left ?? 0) + adjustedPosition.left,
    width: `${size.width}px`,
    height: `${size.height}px`,
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl flex flex-col"
      style={dropdownStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sort Options */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <button
          onClick={() => handleSort('ascending')}
          className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer ${
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
          className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer ${
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
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <button
          onClick={handleClearFilter}
          disabled={!isFiltered}
          className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 cursor-pointer ${
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
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
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
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {/* Select All */}
        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
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
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
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
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-end gap-2">
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

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group"
        title="Drag to resize"
      >
        <svg
          className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
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
