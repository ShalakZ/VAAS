import { Modal, Select } from '../../components/common';
import { formatDateValue } from '../../utils/dateFormatter';

export function RowDetailModal({
  row,
  columnOrder,
  onClose,
  onTeamChange,
  onConfirmFuzzy,
  teamsList,
  canModify,
  canModifyKb,
}) {
  if (!row) return null;

  // Order row entries: original columns first (in order), then classification columns
  const classificationColumns = ['Assigned_Team', 'Reason', 'Needs_Review', 'Method', 'Fuzzy_Score', 'Matched_Rule', 'Pending_Confirmation'];
  const orderedEntries = [];

  // First add original columns in their order
  if (columnOrder && columnOrder.length > 0) {
    columnOrder.forEach(col => {
      if (col in row) {
        orderedEntries.push([col, row[col]]);
      }
    });
  }

  // Then add classification columns
  classificationColumns.forEach(col => {
    if (col in row && !orderedEntries.some(([key]) => key === col)) {
      orderedEntries.push([col, row[col]]);
    }
  });

  // Finally add any remaining columns not yet included
  Object.entries(row).forEach(([key, value]) => {
    if (!orderedEntries.some(([k]) => k === key)) {
      orderedEntries.push([key, value]);
    }
  });

  const renderValue = (key, value) => {
    // Boolean
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded text-xs ${
          value
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
            : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }

    // Date formatting
    const formattedDate = formatDateValue(key, value);
    if (formattedDate) {
      return <span className="font-mono text-blue-700 dark:text-blue-400">{formattedDate}</span>;
    }

    // Numbers (scores/confidence)
    if (typeof value === 'number') {
      const isScore = key.toLowerCase().includes('score') || key.toLowerCase().includes('conf');
      return (
        <span className="font-mono">
          {isScore ? `${(value * 100).toFixed(1)}%` : value}
        </span>
      );
    }

    // Null/undefined
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">N/A</span>;
    }

    // Default string
    return <span className="whitespace-pre-wrap">{String(value)}</span>;
  };

  const isFuzzyMatch = row.Method === 'Fuzzy';

  const handleConfirm = () => {
    onConfirmFuzzy(row);
    onClose();
  };

  const footer = (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {Object.keys(row).length} fields
        </span>
        {isFuzzyMatch && (
          <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
            Fuzzy Match
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {isFuzzyMatch && canModifyKb && (
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
            title="Add this rule to the Knowledge Base permanently"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm & Add to KB
          </button>
        )}
        <Select
          options={teamsList}
          value={row.Assigned_Team}
          disabled={!canModify}
          onChange={(e) => onTeamChange(e.target.value)}
          className={!canModify ? 'opacity-50 cursor-not-allowed' : ''}
          placeholder=""
        />
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={!!row} onClose={onClose} title="Row Details" footer={footer}>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {orderedEntries.map(([key, value]) => (
            <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="py-3 pr-4 font-semibold text-gray-600 dark:text-gray-300 w-1/3 align-top">
                {key}
              </td>
              <td className="py-3 text-gray-800 dark:text-gray-200 break-words">
                {renderValue(key, value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
