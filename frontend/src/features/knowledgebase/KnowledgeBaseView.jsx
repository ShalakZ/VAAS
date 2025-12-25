import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
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
      onDeleteRule(type, key);
    }
  };

  const startEditing = (item) => {
    const key = kbTab === 'hostnames' ? item.hostname : item.title;
    setEditingItem({ originalKey: key, key: key, team: item.team });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col flex-1 min-h-0 border border-gray-200/80 dark:border-gray-700/80">
      {/* Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-b border-gray-200/80 dark:border-gray-700/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white tracking-tight">Knowledge Base</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Manage classification rules and mappings</p>
            </div>
          </div>
          {/* Stats inline */}
          <div className="flex items-center gap-3">
            <div className="text-center px-3">
              <div className="text-lg font-bold text-sky-600 dark:text-sky-400">{kbData.hostnames.length.toLocaleString()}</div>
              <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase">Hostnames</div>
            </div>
            <div className="text-center px-3 border-l border-gray-200 dark:border-gray-700">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{kbData.titles.length.toLocaleString()}</div>
              <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase">Titles</div>
            </div>
            <div className="text-center px-3 border-l border-gray-200 dark:border-gray-700">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{(kbData.hostnames.length + kbData.titles.length).toLocaleString()}</div>
              <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              kbTab === 'hostnames'
                ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => setKbTab('hostnames')}
          >
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
            Hostnames
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              kbTab === 'titles'
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => setKbTab('titles')}
          >
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Title Rules
          </button>
        </div>
      </div>

      {/* Add New Form */}
      {canModifyKb && (
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700/50">
          <div className="p-3 rounded-lg bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-800">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="new-rule-key" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
                  {kbTab === 'hostnames' ? 'Hostname' : 'Title Pattern'}
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
              <div className="w-56">
                <label htmlFor="new-rule-team" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
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
              <Button onClick={handleAddRule} variant="primary" className="shadow-sm">
                <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Rule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Search rules..."
            value={kbSearch}
            onChange={e => setKbSearch(e.target.value)}
            className="w-full pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {kbTab === 'hostnames' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    )}
                  </svg>
                  {kbTab === 'hostnames' ? 'Hostname' : 'Title Pattern'}
                </div>
              </th>
              <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Assigned Team
                </div>
              </th>
              <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredKbList.map((item, idx) => {
              const itemKey = kbTab === 'hostnames' ? item.hostname : item.title;
              const isEditing = editingItem && editingItem.originalKey === itemKey;

              return (
                <tr key={idx} className={isEditing ? 'bg-sky-50 dark:bg-sky-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'}>
                  <td className="p-3">
                    {isEditing ? (
                      <Input
                        value={editingItem.key}
                        onChange={e => setEditingItem({ ...editingItem, key: e.target.value })}
                        className="w-full font-mono text-xs"
                      />
                    ) : (
                      <span className="text-gray-800 dark:text-gray-200 font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {itemKey}
                      </span>
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
                      <span className="inline-flex items-center gap-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-md text-xs font-medium border border-sky-200 dark:border-sky-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                        {item.team}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right pr-4">
                    {isEditing ? (
                      <div className="flex gap-2 justify-end">
                        <Button onClick={handleEditRule} variant="success" size="sm">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </Button>
                        <Button onClick={() => setEditingItem(null)} variant="secondary" size="sm">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    ) : canModifyKb ? (
                      <div className="flex gap-2 justify-end">
                        <Button onClick={() => startEditing(item)} variant="secondary" size="sm">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button onClick={() => handleDeleteRule(itemKey)} variant="danger" size="sm">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">View Only</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredKbList.length === 0 && (
              <tr>
                <td colSpan="3" className="p-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No rules found matching your search.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-t border-gray-200/80 dark:border-gray-700/60">
        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
          <span>Showing {filteredKbList.length} of {kbTab === 'hostnames' ? kbData.hostnames.length : kbData.titles.length} rules</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

KnowledgeBaseView.propTypes = {
  kbData: PropTypes.shape({
    hostnames: PropTypes.arrayOf(PropTypes.shape({
      hostname: PropTypes.string.isRequired,
      team: PropTypes.string.isRequired,
    })).isRequired,
    titles: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string.isRequired,
      team: PropTypes.string.isRequired,
    })).isRequired,
  }).isRequired,
  loading: PropTypes.bool,
  onAddRule: PropTypes.func.isRequired,
  onEditRule: PropTypes.func.isRequired,
  onDeleteRule: PropTypes.func.isRequired,
  onConfirmDelete: PropTypes.func,
  teamsList: PropTypes.arrayOf(PropTypes.string).isRequired,
  canModifyKb: PropTypes.bool.isRequired,
};
