import { useState, useMemo, useEffect } from 'react';
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
    hostname: null,      // Set of selected values or null for all
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

    // High Level Filter
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

    // Column Filters (Set-based)
    Object.keys(columnFilters).forEach(key => {
      const filterSet = columnFilters[key];
      if (filterSet && filterSet.size > 0) {
        items = items.filter(item => {
          const itemValue = item[key] ?? '(Blank)';
          return filterSet.has(itemValue);
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
  }, [highLevelFilteredData, sortConfig, columnFilters]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  // Sort handler - can be called from header click or dropdown
  const handleSort = (key, direction) => {
    if (direction) {
      // Called from dropdown with explicit direction
      setSortConfig({ key, direction });
    } else {
      // Called from header click - cycle through states
      if (sortConfig.key === key) {
        if (sortConfig.direction === 'ascending') {
          setSortConfig({ key, direction: 'descending' });
        } else {
          // Was descending, now reset to no sort
          setSortConfig({ key: null, direction: 'ascending' });
        }
      } else {
        // New column, start with ascending
        setSortConfig({ key, direction: 'ascending' });
      }
    }
  };

  // Filter apply handler - receives Set of selected values
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
