/**
 * Statistics calculation utilities
 */

/**
 * Calculate statistics from data items
 * @param {Array} items - Data items array
 * @returns {Object} - Stats object with total, auto, review, fuzzy counts
 */
export function calculateStats(items) {
  const total = items.length;
  const fuzzy = items.filter(i => i.Method === 'Fuzzy').length;
  const review = items.filter(i => i.Needs_Review && i.Method !== 'Fuzzy').length;
  const auto = total - review - fuzzy;

  return { total, auto, review, fuzzy };
}

/**
 * Calculate incremental stats update for a single row change
 * Performance Optimization: Update stats incrementally instead of full recalculation
 *
 * @param {Object} currentStats - Current statistics
 * @param {Object} oldRow - Previous row state
 * @param {Object} newRow - New row state after change
 * @returns {Object} - Updated stats object
 */
export function updateStatsIncremental(currentStats, oldRow, newRow) {
  const stats = { ...currentStats };

  // Remove old row contribution
  if (oldRow.Method === 'Fuzzy') {
    stats.fuzzy--;
  } else if (oldRow.Needs_Review) {
    stats.review--;
  } else {
    stats.auto--;
  }

  // Add new row contribution
  if (newRow.Method === 'Fuzzy') {
    stats.fuzzy++;
  } else if (newRow.Needs_Review) {
    stats.review++;
  } else {
    stats.auto++;
  }

  // Total remains unchanged for row updates
  return stats;
}

/**
 * Calculate stats delta from a batch of changes
 * Useful for bulk operations like re-classification
 *
 * @param {Array} oldData - Previous data array
 * @param {Array} newData - New data array after changes
 * @returns {Object} - Stats object with deltas
 */
export function calculateStatsDelta(oldData, newData) {
  const oldStats = calculateStats(oldData);
  const newStats = calculateStats(newData);

  return {
    total: newStats.total,
    auto: newStats.auto,
    review: newStats.review,
    fuzzy: newStats.fuzzy,
    delta: {
      auto: newStats.auto - oldStats.auto,
      review: newStats.review - oldStats.review,
      fuzzy: newStats.fuzzy - oldStats.fuzzy
    }
  };
}
