/**
 * Date formatting utilities
 */

const DATE_KEY_PATTERNS = /date|time|created|modified|published|timestamp|_at|detected|seen|found/i;

/**
 * Format a value as a date if the key suggests it's a date field
 * @param {string} key - The field name
 * @param {any} value - The value to format
 * @returns {string|null} - Formatted date or null if not a date
 */
export function formatDateValue(key, value) {
  const isDateKey = DATE_KEY_PATTERNS.test(key);

  if (!isDateKey) return null;

  if (typeof value === 'number') {
    // Excel serial date: days since 1900-01-01 (typically 25000-50000 range)
    if (value > 25000 && value < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return formatDate(date);
    }
    // Unix timestamp in seconds (after year 2000)
    if (value > 946684800 && value < 4102444800) {
      return formatDate(new Date(value * 1000));
    }
    // Unix timestamp in milliseconds
    if (value > 946684800000) {
      return formatDate(new Date(value));
    }
  }

  // Handle String Dates
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }
  }

  return null;
}

/**
 * Format a Date object to locale string
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
