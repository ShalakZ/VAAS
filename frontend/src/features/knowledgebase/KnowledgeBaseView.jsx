import { useState, useMemo } from 'react';
import { Input, Select, Button } from '../../components/common';
import { useToast } from '../../context';

export function KnowledgeBaseView({
  kbData,
  loading,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onConfirmDelete,
  teamsList,
  canModifyKb,
}) {
  const toast = useToast();
  const [kbTab, setKbTab] = useState('hostnames');
  const [kbSearch, setKbSearch] = useState('');
  const [newRule, setNewRule] = useState({ key: '', team: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [formErrors, setFormErrors] = useState({ key: '', team: '' });

  const filteredKbList = useMemo(() => {
    const list = kbTab === 'hostnames' ? kbData.hostnames : kbData.titles;
    if (!kbSearch) return list;
    return list.filter(item => {
      const val = kbTab === 'hostnames' ? item.hostname : item.title;
      return val.toLowerCase().includes(kbSearch.toLowerCase()) ||
        item.team.toLowerCase().includes(kbSearch.toLowerCase());
    });
  }, [kbData, kbTab, kbSearch]);

  const validateForm = () => {
    const errors = { key: '', team: '' };
    let isValid = true;

    if (!newRule.key.trim()) {
      errors.key = kbTab === 'hostnames' ? 'Hostname is required' : 'Title pattern is required';
      isValid = false;
    }

    if (!newRule.team) {
      errors.team = 'Please select a team';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleInputChange = (field, value) => {
    setNewRule({ ...newRule, [field]: value });
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };

  const handleAddRule = async () => {
    if (!validateForm()) {
      return;
    }

    const type = kbTab === 'hostnames' ? 'hostname' : 'title';
    const success = await onAddRule(type, newRule.key, newRule.team);
    if (success) {
      setNewRule({ key: '', team: '' });
      setFormErrors({ key: '', team: '' });
    }
  };

  const handleEditRule = async () => {
    if (!editingItem || !editingItem.key || !editingItem.team) {
      toast.warning('Please fill all fields');
      return;
    }

    const type = kbTab === 'hostnames' ? 'hostname' : 'title';
    const success = await onEditRule(type, editingItem.originalKey, editingItem.key, editingItem.team);
    if (success) {
      setEditingItem(null);
    }
  };

  const handleDeleteRule = (key) => {
    const type = kbTab === 'hostnames' ? 'hostname' : 'title';
    if (onConfirmDelete) {
      onConfirmDelete(type, key);
    } else {
      // Fallback if no confirm handler provided
      onDeleteRule(type, key);
    }
  };

  const startEditing = (item) => {
    const key = kbTab === 'hostnames' ? item.hostname : item.title;
    setEditingItem({ originalKey: key, key: key, team: item.team });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-[calc(100vh-150px)] border dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Knowledge Base Management</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 pt-4 mb-6 border-b dark:border-gray-700">
        <button
          className={`pb-2 px-4 font-medium transition-colors ${
            kbTab === 'hostnames'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setKbTab('hostnames')}
        >
          Hostnames ({kbData.hostnames.length})
        </button>
        <button
          className={`pb-2 px-4 font-medium transition-colors ${
            kbTab === 'titles'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setKbTab('titles')}
        >
          Title Rules ({kbData.titles.length})
        </button>
      </div>

      {/* Add New Form */}
      {canModifyKb && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded mb-6 mx-4 flex gap-4 items-end border dark:border-blue-900/50">
          <div className="flex-1">
            <label htmlFor="new-rule-key" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              {kbTab === 'hostnames' ? 'New Hostname' : 'New Title Pattern'}
            </label>
            <Input
              id="new-rule-key"
              placeholder={kbTab === 'hostnames' ? 'e.g. server-db-01' : 'e.g. SQL Injection'}
              value={newRule.key}
              onChange={e => handleInputChange('key', e.target.value)}
              className={`w-full ${formErrors.key ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : ''}`}
              aria-invalid={!!formErrors.key}
              aria-describedby={formErrors.key ? 'new-rule-key-error' : undefined}
            />
            {formErrors.key && (
              <p id="new-rule-key-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {formErrors.key}
              </p>
            )}
          </div>
          <div className="w-64">
            <label htmlFor="new-rule-team" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Assign To Team
            </label>
            <Select
              id="new-rule-team"
              options={teamsList}
              value={newRule.team}
              onChange={e => handleInputChange('team', e.target.value)}
              placeholder="Select Team..."
              className={`w-full ${formErrors.team ? 'border-red-500 dark:border-red-500' : ''}`}
              aria-invalid={!!formErrors.team}
              aria-describedby={formErrors.team ? 'new-rule-team-error' : undefined}
            />
            {formErrors.team && (
              <p id="new-rule-team-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {formErrors.team}
              </p>
            )}
          </div>
          <Button onClick={handleAddRule} variant="primary">
            Add Rule +
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="px-4 mb-4">
        <Input
          placeholder="Search rules..."
          value={kbSearch}
          onChange={e => setKbSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 p-0 bg-white dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/2">
                {kbTab === 'hostnames' ? 'Hostname' : 'Title Pattern'}
              </th>
              <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/4">Assigned Team</th>
              <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredKbList.map((item, idx) => {
              const itemKey = kbTab === 'hostnames' ? item.hostname : item.title;
              const isEditing = editingItem && editingItem.originalKey === itemKey;

              return (
                <tr key={idx} className={isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'}>
                  <td className="p-3">
                    {isEditing ? (
                      <Input
                        value={editingItem.key}
                        onChange={e => setEditingItem({ ...editingItem, key: e.target.value })}
                        className="w-full font-mono"
                      />
                    ) : (
                      <span className="text-gray-800 dark:text-gray-200 font-mono text-xs">{itemKey}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <Select
                        options={teamsList}
                        value={editingItem.team}
                        onChange={e => setEditingItem({ ...editingItem, team: e.target.value })}
                        className="w-full"
                        placeholder=""
                      />
                    ) : (
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded text-xs font-medium border dark:border-gray-600">
                        {item.team}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right pr-8">
                    {isEditing ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={handleEditRule}
                          variant="success"
                          size="sm"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingItem(null)}
                          variant="secondary"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : canModifyKb ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => startEditing(item)}
                          variant="primary"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteRule(itemKey)}
                          variant="danger"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 whitespace-nowrap">View Only</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredKbList.length === 0 && (
              <tr>
                <td colSpan="3" className="p-8 text-center text-gray-400 dark:text-gray-500">
                  No rules found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
