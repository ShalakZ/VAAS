import { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { StatsBar } from './StatsBar';
import { DataTable } from './DataTable';
import { Pagination } from './Pagination';
import { RowDetailModal } from './RowDetailModal';
import { ExportButton, Button } from '../../components/common';

export function ReviewView({
  data,
  stats,
  columnOrder,
  onTeamChange,
  onConfirmChange,
  onSaveToKb,
  onConfirmFuzzy,
  onExport,
  exportingType,
  exportProgress,
  teamsList,
  permissions,
}) {
  // Filter State
  const [filter, setFilter] = useState('all');
  const [columnFilters, setColumnFilters] = useState({
    hostname: null,
    Title: null,
    Assigned_Team: null,
    Reason: null,
  });

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Modal State
  const [selectedRow, setSelectedRow] = useState(null);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, columnFilters, sortConfig, itemsPerPage]);

  // High-level filtered data (before column filters) - for getting unique values
  const highLevelFilteredData = useMemo(() => {
    let items = [...data];

    if (filter === 'review') {
      items = items.filter(item => item.Needs_Review && item.Method !== 'Fuzzy');
    } else if (filter === 'auto') {
      items = items.filter(item => !item.Needs_Review && item.Method !== 'Fuzzy');
    } else if (filter === 'fuzzy') {
      items = items.filter(item => item.Method === 'Fuzzy');
    }

    return items;
  }, [data, filter]);

  // Processed Data with column filtering and sorting
  const processedData = useMemo(() => {
    let items = [...highLevelFilteredData];

    Object.keys(columnFilters).forEach(key => {
      const filterSet = columnFilters[key];
      if (filterSet && filterSet.size > 0) {
        items = items.filter(item => {
          const itemValue = item[key] ?? '(Blank)';
          return filterSet.has(itemValue);
        });
      }
    });

    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [highLevelFilteredData, sortConfig, columnFilters]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  const handleSort = (key, direction) => {
    if (direction) {
      setSortConfig({ key, direction });
    } else {
      if (sortConfig.key === key) {
        if (sortConfig.direction === 'ascending') {
          setSortConfig({ key, direction: 'descending' });
        } else {
          setSortConfig({ key: null, direction: 'ascending' });
        }
      } else {
        setSortConfig({ key, direction: 'ascending' });
      }
    }
  };

  const handleFilterApply = (key, selectedValues) => {
    setColumnFilters(prev => ({ ...prev, [key]: selectedValues }));
  };

  const handleRowTeamChange = (row, newTeam) => {
    onTeamChange(row, newTeam);
  };

  const handleModalTeamChange = (newTeam) => {
    onTeamChange(selectedRow, newTeam);
    setSelectedRow({
      ...selectedRow,
      Assigned_Team: newTeam,
      Needs_Review: newTeam === 'Unclassified' || newTeam === 'Application',
      Method: 'Manual Override',
      Confidence_Score: 1.0,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col flex-1 min-h-0 border border-gray-200/80 dark:border-gray-700/80">
      {/* Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-b border-gray-200/80 dark:border-gray-700/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white tracking-tight">Analysis Results</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Review and assign vulnerability findings</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {permissions.canExport && (
              <>
                <ExportButton
                  onClick={() => onExport('master')}
                  disabled={!!exportingType}
                  isExporting={exportingType === 'master' ? exportProgress : null}
                  label="Export Master"
                  exportingLabel="Generating..."
                  color="blue"
                />
                <ExportButton
                  onClick={() => onExport('teams')}
                  disabled={!!exportingType}
                  isExporting={exportingType === 'teams' ? exportProgress : null}
                  label="Export Teams"
                  exportingLabel="Zipping..."
                  color="green"
                />
              </>
            )}

            {permissions.canModifyKb && (
              <Button
                variant="primary"
                onClick={onSaveToKb}
                title="Permanently save Hostnames AND Titles to the Knowledge Base."
                className="shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save to KB
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-2 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700/50">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`stat-card px-3 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 ring-1 ring-sky-200 dark:ring-sky-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-sky-50/50 dark:hover:bg-sky-900/20'
            }`}
          >
            <div className={`text-lg font-bold ${filter === 'all' ? 'text-sky-600 dark:text-sky-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {stats.total.toLocaleString()}
            </div>
            <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</div>
          </button>

          <button
            onClick={() => setFilter('auto')}
            className={`stat-card px-3 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
              filter === 'auto'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20'
            }`}
          >
            <div className={`text-lg font-bold ${filter === 'auto' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {stats.auto.toLocaleString()}
            </div>
            <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Auto</div>
          </button>

          <button
            onClick={() => setFilter('fuzzy')}
            className={`stat-card px-3 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
              filter === 'fuzzy'
                ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
            }`}
          >
            <div className={`text-lg font-bold ${filter === 'fuzzy' ? 'text-orange-600 dark:text-orange-400' : 'text-orange-500 dark:text-orange-400'}`}>
              {stats.fuzzy.toLocaleString()}
            </div>
            <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Predicted</div>
          </button>

          <button
            onClick={() => setFilter('review')}
            className={`stat-card px-3 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
              filter === 'review'
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/20'
            }`}
          >
            <div className={`text-lg font-bold ${filter === 'review' ? 'text-amber-600 dark:text-amber-400' : 'text-amber-500 dark:text-amber-400'}`}>
              {stats.review.toLocaleString()}
            </div>
            <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Review</div>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-auto flex-1">
        <DataTable
          data={paginatedData}
          allData={highLevelFilteredData}
          sortConfig={sortConfig}
          onSort={handleSort}
          columnFilters={columnFilters}
          onFilterApply={handleFilterApply}
          onRowClick={setSelectedRow}
          onTeamChange={handleRowTeamChange}
          onConfirmChange={onConfirmChange}
          onConfirmFuzzy={onConfirmFuzzy}
          teamsList={teamsList}
          canModify={permissions.canModify}
          canModifyKb={permissions.canModifyKb}
        />
      </div>

      {/* Pagination */}
      <div className="border-t border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Row Detail Modal */}
      <RowDetailModal
        row={selectedRow}
        columnOrder={columnOrder}
        onClose={() => setSelectedRow(null)}
        onTeamChange={handleModalTeamChange}
        onConfirmFuzzy={onConfirmFuzzy}
        teamsList={teamsList}
        canModify={permissions.canModify}
        canModifyKb={permissions.canModifyKb}
      />
    </div>
  );
}

ReviewView.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  stats: PropTypes.shape({
    total: PropTypes.number,
    auto: PropTypes.number,
    review: PropTypes.number,
    fuzzy: PropTypes.number,
  }).isRequired,
  columnOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  onTeamChange: PropTypes.func.isRequired,
  onConfirmChange: PropTypes.func.isRequired,
  onSaveToKb: PropTypes.func.isRequired,
  onConfirmFuzzy: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  exportingType: PropTypes.string,
  exportProgress: PropTypes.number,
  teamsList: PropTypes.arrayOf(PropTypes.string).isRequired,
  permissions: PropTypes.shape({
    canModify: PropTypes.bool,
    canModifyKb: PropTypes.bool,
    canExport: PropTypes.bool,
  }).isRequired,
};
