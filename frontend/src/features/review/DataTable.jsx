import { FilterInput, Select } from '../../components/common';

export function DataTable({
  data,
  sortConfig,
  onSort,
  columnFilters,
  onFilterChange,
  onRowClick,
  onTeamChange,
  onConfirmChange,
  onConfirmFuzzy,
  teamsList,
  canModify,
  canModifyKb,
}) {
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="text-gray-300 dark:text-gray-500 ml-1">⇅</span>;
    if (sortConfig.direction === 'ascending') return <span className="text-gray-600 dark:text-gray-300 ml-1">↑</span>;
    return <span className="text-gray-600 dark:text-gray-300 ml-1">↓</span>;
  };

  const getRowClass = (row) => {
    if (row.Method === 'Fuzzy') {
      return 'bg-orange-100 dark:bg-orange-900/20 hover:bg-orange-200 dark:hover:bg-orange-900/40';
    }
    if (row.Needs_Review) {
      return 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40';
    }
    return 'hover:bg-blue-50 dark:hover:bg-gray-700';
  };

  const columns = [
    { key: 'hostname', label: 'Hostname', filterPlaceholder: 'Host' },
    { key: 'Title', label: 'Title', filterPlaceholder: 'Title' },
    { key: 'Assigned_Team', label: 'Assigned Team', filterPlaceholder: 'Team' },
    { key: 'Reason', label: 'Reason', filterPlaceholder: 'Reason' },
  ];

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
        <tr>
          {columns.map(({ key, label, filterPlaceholder }) => (
            <th
              key={key}
              className="p-3 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer"
              onClick={() => onSort(key)}
            >
              {label} {getSortIcon(key)}
              <FilterInput
                value={columnFilters[key] || ''}
                placeholder={`Filter ${filterPlaceholder}...`}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onFilterChange(key, e.target.value)}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {data.map((row, idx) => (
          <tr
            key={idx}
            className={`cursor-pointer transition-colors ${getRowClass(row)}`}
            onClick={() => onRowClick(row)}
          >
            <td className="p-3 max-w-xs truncate text-gray-800 dark:text-gray-200" title={row.hostname}>
              {row.hostname}
            </td>
            <td className="p-3 max-w-sm truncate text-gray-800 dark:text-gray-200" title={row.Title}>
              {row.Title}
            </td>
            <td className="p-3" onClick={(e) => e.stopPropagation()}>
              <Select
                options={teamsList}
                value={row.Assigned_Team}
                onChange={(e) => onTeamChange(row, e.target.value)}
                disabled={!canModify}
                highlight={row.Needs_Review}
                className="w-full"
                placeholder=""
                title={!canModify ? 'You do not have permission to modify assignments' : ''}
              />
            </td>
            <td className="p-3 text-gray-500 dark:text-gray-400 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex-1">{row.Reason}</span>
                {/* Confirm button for manual team changes */}
                {row.Pending_Confirmation && canModify && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmChange(row);
                    }}
                    className="flex-shrink-0 p-1 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 transition-colors cursor-pointer"
                    title="Confirm team assignment and remove from review"
                    aria-label="Confirm team assignment"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
                {/* Confirm button for fuzzy matches */}
                {row.Method === 'Fuzzy' && canModifyKb && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmFuzzy(row);
                    }}
                    className="flex-shrink-0 p-1 rounded bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 transition-colors cursor-pointer"
                    title="Confirm this match and add to Knowledge Base"
                    aria-label="Confirm fuzzy match and add to Knowledge Base"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
