import { useState, useRef } from 'react';
import { Select, ColumnFilterDropdown } from '../../components/common';

export function DataTable({
  data,
  allData, // Full dataset for getting all unique values
  sortConfig,
  onSort,
  columnFilters,
  onFilterApply,
  onRowClick,
  onTeamChange,
  onConfirmChange,
  onConfirmFuzzy,
  teamsList,
  canModify,
  canModifyKb,
}) {
  const [openFilter, setOpenFilter] = useState(null);
  const headerRefs = useRef({});

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="text-gray-300 dark:text-gray-500 ml-1">⇅</span>;
    if (sortConfig.direction === 'ascending') return <span className="text-blue-600 dark:text-blue-400 ml-1">↑</span>;
    return <span className="text-blue-600 dark:text-blue-400 ml-1">↓</span>;
  };

  const getFilterIcon = (key) => {
    const isFiltered = columnFilters[key] && columnFilters[key].size > 0;
    return (
      <span className={`ml-1 ${isFiltered ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
        <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </span>
    );
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
    { key: 'hostname', label: 'Hostname' },
    { key: 'Title', label: 'Title' },
    { key: 'Assigned_Team', label: 'Assigned Team' },
    { key: 'Reason', label: 'Reason' },
  ];

  const handleFilterClick = (e, key) => {
    e.stopPropagation();
    setOpenFilter(openFilter === key ? null : key);
  };

  const handleFilterApply = (key, selectedValues) => {
    onFilterApply(key, selectedValues);
  };

  const handleSort = (key, direction) => {
    onSort(key, direction);
  };

  // Get all values for a column from the full dataset
  const getColumnValues = (key) => {
    return (allData || data).map(row => row[key]);
  };

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
        <tr>
          {columns.map(({ key, label }) => (
            <th
              key={key}
              ref={el => headerRefs.current[key] = el}
              className="p-3 font-semibold text-gray-600 dark:text-gray-300 relative"
            >
              <div className="flex items-center gap-1">
                <span
                  className="cursor-pointer hover:text-gray-800 dark:hover:text-white flex items-center"
                  onClick={() => onSort(key)}
                >
                  {label} {getSortIcon(key)}
                </span>
                <button
                  onClick={(e) => handleFilterClick(e, key)}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer ${
                    openFilter === key ? 'bg-gray-200 dark:bg-gray-700' : ''
                  }`}
                  title={`Filter by ${label}`}
                >
                  {getFilterIcon(key)}
                </button>
              </div>

              <ColumnFilterDropdown
                columnKey={key}
                columnLabel={label}
                allValues={getColumnValues(key)}
                selectedValues={columnFilters[key]}
                onApply={handleFilterApply}
                onSort={handleSort}
                currentSort={sortConfig}
                isOpen={openFilter === key}
                onClose={() => setOpenFilter(null)}
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
