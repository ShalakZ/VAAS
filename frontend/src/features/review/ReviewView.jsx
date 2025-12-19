import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from '../../hooks';
import { StatsBar } from './StatsBar';
import { DataTable } from './DataTable';
import { Pagination } from './Pagination';
import { RowDetailModal } from './RowDetailModal';
import { ExportButton, Button } from '../../components/common';

export function ReviewView({
  data,
  stats,
  onTeamChange,
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
    hostname: '',
    Title: '',
    Assigned_Team: '',
    Reason: '',
  });

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Modal State
  const [selectedRow, setSelectedRow] = useState(null);

  // Debounced filters
  const debouncedFilters = useDebounce(columnFilters, 300);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedFilters, sortConfig, itemsPerPage]);

  // Processed Data with filtering and sorting
  const processedData = useMemo(() => {
    let items = [...data];

    // High Level Filter
    if (filter === 'review') {
      items = items.filter(item => item.Needs_Review && item.Method !== 'Fuzzy');
    } else if (filter === 'auto') {
      items = items.filter(item => !item.Needs_Review && item.Method !== 'Fuzzy');
    } else if (filter === 'fuzzy') {
      items = items.filter(item => item.Method === 'Fuzzy');
    }

    // Column Filters
    Object.keys(debouncedFilters).forEach(key => {
      const filterValue = debouncedFilters[key].toLowerCase();
      if (filterValue) {
        items = items.filter(item => {
          const itemValue = String(item[key] || '').toLowerCase();
          return itemValue.includes(filterValue);
        });
      }
    });

    // Sort
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
  }, [data, sortConfig, filter, debouncedFilters]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key, value) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-[calc(100vh-150px)] border dark:border-gray-700">
      {/* Header Bar */}
      <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
        <StatsBar
          stats={stats}
          filter={filter}
          setFilter={setFilter}
          currentPage={currentPage}
          totalPages={totalPages}
        />

        <div className="flex gap-2">
          {permissions.canExport && (
            <>
              <ExportButton
                onClick={() => onExport('master')}
                disabled={!!exportingType}
                isExporting={exportingType === 'master' ? exportProgress : null}
                label="⬇ Export Master"
                exportingLabel="Generating..."
                color="blue"
              />
              <ExportButton
                onClick={() => onExport('teams')}
                disabled={!!exportingType}
                isExporting={exportingType === 'teams' ? exportProgress : null}
                label="⬇ Export Teams ZIP"
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
            >
              💾 Save Rules to KB
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-auto flex-1">
        <DataTable
          data={paginatedData}
          sortConfig={sortConfig}
          onSort={handleSort}
          columnFilters={columnFilters}
          onFilterChange={handleFilterChange}
          onRowClick={setSelectedRow}
          onTeamChange={handleRowTeamChange}
          onConfirmFuzzy={onConfirmFuzzy}
          teamsList={teamsList}
          canModify={permissions.canModify}
          canModifyKb={permissions.canModifyKb}
        />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {/* Row Detail Modal */}
      <RowDetailModal
        row={selectedRow}
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
