export function StatsBar({ stats, filter, setFilter, currentPage, totalPages }) {
  const filterButtons = [
    { key: 'all', label: 'Total', count: stats.total, colors: 'bg-blue-600 text-white shadow-md', inactiveColors: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50' },
    { key: 'auto', label: 'Auto Assignment', count: stats.auto, colors: 'bg-green-600 text-white shadow-md', inactiveColors: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' },
    { key: 'fuzzy', label: 'Auto Prediction', count: stats.fuzzy, colors: 'bg-orange-500 text-white shadow-md', inactiveColors: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50' },
    { key: 'review', label: 'Review', count: stats.review, colors: 'bg-yellow-500 text-white shadow-md', inactiveColors: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' },
  ];

  return (
    <div className="flex gap-4 text-sm" role="group" aria-label="Filter results by category">
      {filterButtons.map(({ key, label, count, colors, inactiveColors }) => (
        <button
          key={key}
          onClick={() => setFilter(key)}
          className={`px-3 py-1 rounded-full font-medium transition ${
            filter === key ? colors : inactiveColors
          }`}
          aria-pressed={filter === key}
        >
          {label}: <span aria-live="polite">{count}</span>
        </button>
      ))}
      <span className="ml-4 text-gray-500 dark:text-gray-400 border-l dark:border-gray-600 pl-4 self-center" aria-live="polite">
        Page {currentPage} of {totalPages || 1}
      </span>
    </div>
  );
}
