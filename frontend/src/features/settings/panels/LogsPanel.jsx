import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, ConfirmModal } from '../../../components/common';
import { useToast } from '../../../context';
import { ActionIcon } from '../components';

// Constants
const CATEGORIES = ['all', 'audit', 'security', 'auth', 'application', 'database', 'system', 'kb', 'upload', 'export', 'user', 'settings'];
const LEVELS = ['all', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const PER_PAGE_OPTIONS = [50, 100, 200, 500];
const QUICK_FILTERS = ['all', 'audit', 'security', 'auth', 'application', 'database', 'system'];

// Demo logs for when API is not available
const DEMO_LOGS = [
  { id: 1, timestamp: new Date().toISOString(), username: 'admin', action: 'Login', details: 'User logged in successfully', type: 'auth', level: 'INFO', category: 'security' },
  { id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), username: 'admin', action: 'KB Rule Added', details: 'Added hostname rule: db-server-01 to Database Team', type: 'kb', level: 'INFO', category: 'audit' },
  { id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), username: 'secadmin', action: 'File Upload', details: 'Uploaded vulnerability_report_Q4.xlsx (1,234 rows)', type: 'upload', level: 'INFO', category: 'application' },
  { id: 4, timestamp: new Date(Date.now() - 10800000).toISOString(), username: 'admin', action: 'Export', details: 'Exported master report (1,234 rows)', type: 'export', level: 'INFO', category: 'application' },
  { id: 5, timestamp: new Date(Date.now() - 14400000).toISOString(), username: 'viewer', action: 'Login', details: 'User logged in successfully', type: 'auth', level: 'INFO', category: 'security' },
  { id: 6, timestamp: new Date(Date.now() - 18000000).toISOString(), username: 'admin', action: 'User Created', details: 'Created user: secadmin (Security Admin)', type: 'user', level: 'INFO', category: 'audit' },
  { id: 7, timestamp: new Date(Date.now() - 86400000).toISOString(), username: 'secadmin', action: 'KB Rule Edited', details: 'Modified title rule: SQL Injection to System Admin', type: 'kb', level: 'INFO', category: 'audit' },
  { id: 8, timestamp: new Date(Date.now() - 172800000).toISOString(), username: 'admin', action: 'Settings Changed', details: 'Updated LDAP configuration', type: 'settings', level: 'WARNING', category: 'system' },
];

/**
 * Audit logs panel for viewing system activity
 */
export function LogsPanel() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('viewer');
  const [selectedLog, setSelectedLog] = useState(null);

  // Statistics state
  const [stats, setStats] = useState({
    total_logs: 0,
    last_24h: 0,
    db_size_mb: 0,
    active_filters: 0,
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [filters, setFilters] = useState({
    category: 'all',
    level: 'all',
    username: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({ ...filters });

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Maintenance state
  const [retentionDays, setRetentionDays] = useState(90);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [logsByCategory, setLogsByCategory] = useState({});
  const [logsByLevel, setLogsByLevel] = useState({});

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ show: false });

  const countActiveFilters = () => {
    let count = 0;
    if (appliedFilters.category !== 'all') count++;
    if (appliedFilters.level !== 'all') count++;
    if (appliedFilters.username) count++;
    if (appliedFilters.search) count++;
    if (appliedFilters.startDate) count++;
    if (appliedFilters.endDate) count++;
    return count;
  };

  // Initial load
  useEffect(() => {
    fetchLogs();
    fetchStats();
    setInitialLoadDone(true);
  }, []);

  // Re-fetch when pagination changes
  useEffect(() => {
    if (initialLoadDone) {
      fetchLogs();
    }
  }, [pagination.page, pagination.perPage]);

  // Live filter updates
  useEffect(() => {
    if (initialLoadDone) {
      setAppliedFilters({ ...filters });
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [filters.category, filters.level, filters.username, filters.search, filters.startDate, filters.endDate]);

  // Re-fetch when appliedFilters change
  useEffect(() => {
    if (initialLoadDone) {
      fetchLogs();
      fetchStats();
    }
  }, [appliedFilters]);

  // Auto-refresh effect
  useEffect(() => {
    let interval;
    if (autoRefresh && initialLoadDone) {
      interval = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, refreshInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/settings/api/logs/statistics');
      const data = await res.json();
      if (data.success) {
        const s = data.statistics || data;
        setStats({
          total_logs: s.total_logs || s.total || 0,
          last_24h: s.last_24h || s.last_24_hours || 0,
          db_size_mb: s.db_size_mb || s.database_size_mb || 0,
          active_filters: countActiveFilters(),
        });
        setLogsByCategory(s.by_category || {});
        setLogsByLevel(s.by_level || {});
      }
    } catch (err) {
      console.error('Failed to fetch log statistics');
      setStats({
        total_logs: DEMO_LOGS.length,
        last_24h: DEMO_LOGS.filter(l => new Date(l.timestamp) > new Date(Date.now() - 86400000)).length,
        db_size_mb: 0.5,
        active_filters: countActiveFilters(),
      });
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.perPage,
        offset: (pagination.page - 1) * pagination.perPage,
      });
      if (appliedFilters.category !== 'all') params.append('category', appliedFilters.category);
      if (appliedFilters.level !== 'all') params.append('level', appliedFilters.level);
      if (appliedFilters.username) params.append('username', appliedFilters.username);
      if (appliedFilters.search) params.append('search', appliedFilters.search);
      if (appliedFilters.startDate) params.append('start_date', appliedFilters.startDate);
      if (appliedFilters.endDate) params.append('end_date', appliedFilters.endDate);

      const res = await fetch(`/settings/api/logs?${params}`);
      const data = await res.json();
      if (data.success && data.logs?.length > 0) {
        setLogs(data.logs);
        setPagination(prev => ({
          ...prev,
          total: data.total || data.logs.length,
          totalPages: Math.ceil((data.total || data.logs.length) / prev.perPage),
        }));
      } else {
        setLogs(DEMO_LOGS);
        setPagination(prev => ({
          ...prev,
          total: DEMO_LOGS.length,
          totalPages: 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load logs, using demo data');
      setLogs(DEMO_LOGS);
      setPagination(prev => ({ ...prev, total: DEMO_LOGS.length, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const defaultFilters = { category: 'all', level: 'all', username: '', search: '', startDate: '', endDate: '' };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExportCSV = async () => {
    try {
      const body = {};
      if (appliedFilters.category !== 'all') body.category = appliedFilters.category;
      if (appliedFilters.level !== 'all') body.level = appliedFilters.level;
      if (appliedFilters.username) body.username = appliedFilters.username;
      if (appliedFilters.search) body.search = appliedFilters.search;
      if (appliedFilters.startDate) body.start_date = appliedFilters.startDate;
      if (appliedFilters.endDate) body.end_date = appliedFilters.endDate;

      const res = await fetch('/settings/api/logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Logs exported successfully');
      } else {
        toast.error('Failed to export logs');
      }
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
  };

  const handleCleanup = () => {
    setConfirmModal({ show: true });
  };

  const executeCleanup = async () => {
    setConfirmModal({ show: false });
    setCleaningUp(true);
    try {
      const res = await fetch('/settings/api/logs/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retention_days: retentionDays }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Cleanup complete. ${data.deleted_count || 0} logs removed.`);
        fetchLogs();
        fetchStats();
      } else {
        toast.error('Cleanup failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Cleanup failed: ' + err.message);
    } finally {
      setCleaningUp(false);
    }
  };

  const getActionBadge = (actionOrCategory) => {
    const badges = {
      'audit': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'security': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'auth': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'application': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'database': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      'system': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'kb': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'upload': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
      'export': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      'user': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      'settings': 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      'Login': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'Logout': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      'KB Rule Added': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'KB Rule Edited': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'KB Rule Deleted': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'File Upload': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'Export': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'User Created': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'User Deleted': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'Settings Changed': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    };
    return badges[actionOrCategory] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const getLevelBadge = (level) => {
    const badges = {
      'DEBUG': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      'INFO': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'WARNING': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'ERROR': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'CRITICAL': 'bg-red-200 text-red-800 dark:bg-red-800/50 dark:text-red-200',
    };
    return badges[level] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatTimestamp = (ts) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="p-5 min-h-[400px]">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">Audit Logs</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Monitor system activity, user actions, and security events</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Auto-refresh</span>
            </label>
            {autoRefresh && (
              <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="border dark:border-gray-600 rounded px-1.5 py-0.5 text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                <option value="5">5s</option>
                <option value="10">10s</option>
                <option value="30">30s</option>
                <option value="60">60s</option>
              </select>
            )}
          </div>
          <Button variant="secondary" onClick={handleExportCSV}><ActionIcon type="csv" className="w-4 h-4 inline mr-1" />CSV</Button>
          <Button variant="secondary" onClick={() => { fetchLogs(); fetchStats(); }} disabled={loading}><ActionIcon type="refresh" className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="stat-card settings-section p-3 text-center">
          <div className="text-xl font-bold text-sky-600 dark:text-sky-400">{stats.total_logs.toLocaleString()}</div>
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">Total Logs</div>
        </div>
        <div className="stat-card settings-section p-3 text-center">
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.last_24h.toLocaleString()}</div>
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">Last 24h</div>
        </div>
        <div className="stat-card settings-section p-3 text-center">
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.db_size_mb.toFixed(1)} <span className="text-sm font-medium">MB</span></div>
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">DB Size</div>
        </div>
        <div className="stat-card settings-section p-3 text-center">
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.active_filters}</div>
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">Active Filters</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => setActiveTab('viewer')}
          className={`settings-tab px-4 py-2.5 font-medium text-sm transition-colors ${
            activeTab === 'viewer'
              ? 'active text-sky-600 dark:text-sky-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Log Viewer
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={`settings-tab px-4 py-2.5 font-medium text-sm transition-colors flex items-center gap-1.5 ${
            activeTab === 'filters'
              ? 'active text-sky-600 dark:text-sky-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Filters
          {stats.active_filters > 0 && (
            <span className="settings-badge px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 rounded-md">{stats.active_filters}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`settings-tab px-4 py-2.5 font-medium text-sm transition-colors ${
            activeTab === 'maintenance'
              ? 'active text-sky-600 dark:text-sky-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Maintenance
        </button>
      </div>

      {/* Log Viewer Tab */}
      {activeTab === 'viewer' && (
        <>
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
            {QUICK_FILTERS.map(qf => (
              <button
                key={qf}
                onClick={() => {
                  setFilters(prev => ({ ...prev, category: qf }));
                  setAppliedFilters(prev => ({ ...prev, category: qf }));
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  appliedFilters.category === qf
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {qf === 'all' ? 'All Logs' : qf.charAt(0).toUpperCase() + qf.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">{"📋"}</div>
              <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Logs Found</h4>
              <p className="text-gray-500 dark:text-gray-400">
                {stats.active_filters > 0 ? 'No logs match the current filters.' : 'Activity logs will appear here as users interact with the system.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Time</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">User</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Level</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {logs.map((log, idx) => (
                      <tr
                        key={log.id || idx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{formatTimestamp(log.timestamp)}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{log.username || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelBadge(log.level || 'INFO')}`}>
                            {log.level || 'INFO'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadge(log.category || log.action)}`}>
                            {log.category || log.action || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate max-w-md">{log.message || log.details || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.perPage) + 1} to {Math.min(pagination.page * pagination.perPage, pagination.total)} of {pagination.total} logs
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={pagination.perPage}
                    onChange={(e) => setPagination(prev => ({ ...prev, perPage: Number(e.target.value), page: 1 }))}
                    className="border dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  >
                    {PER_PAGE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt} per page</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Filters Tab */}
      {activeTab === 'filters' && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border dark:border-gray-700">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Advanced Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Log Level</label>
              <select
                value={filters.level}
                onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                {LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl === 'all' ? 'All Levels' : lvl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => setFilters(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Filter by username..."
                className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search in logs..."
                className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <Button variant="secondary" onClick={clearFilters}>Clear All Filters</Button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Filters are applied automatically as you type</span>
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Log Cleanup Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Log Cleanup</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Remove logs older than the specified retention period to free up database space.
            </p>
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Retention Period:</label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days (default)</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
              <Button variant="danger" onClick={handleCleanup} disabled={cleaningUp}>
                {cleaningUp ? 'Cleaning...' : 'Clean Up Logs'}
              </Button>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Warning:</strong> This action is irreversible. Logs older than {retentionDays} days will be permanently deleted.
            </div>
          </div>

          {/* Log Statistics Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Log Statistics</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Category */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">By Category</h5>
                <div className="space-y-2">
                  {Object.keys(logsByCategory).length > 0 ? (
                    Object.entries(logsByCategory).map(([cat, count]) => (
                      <div key={cat} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">{cat}</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{count.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No category data available</div>
                  )}
                </div>
              </div>

              {/* By Level */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">By Level</h5>
                <div className="space-y-2">
                  {Object.keys(logsByLevel).length > 0 ? (
                    Object.entries(logsByLevel).map(([level, count]) => (
                      <div key={level} className="flex justify-between text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelBadge(level)}`}>{level}</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{count.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No level data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
          onKeyDown={(e) => e.key === 'Escape' && setSelectedLog(null)}
          tabIndex={-1}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-2xl"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-500 dark:text-gray-400">Timestamp</div>
                  <div className="text-gray-800 dark:text-gray-200">{formatTimestamp(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500 dark:text-gray-400">Username</div>
                  <div className="text-gray-800 dark:text-gray-200">{selectedLog.username || '-'}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500 dark:text-gray-400">Level</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getLevelBadge(selectedLog.level || 'INFO')}`}>
                    {selectedLog.level || 'INFO'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-500 dark:text-gray-400">Category</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getActionBadge(selectedLog.category || selectedLog.type)}`}>
                    {selectedLog.category || selectedLog.type || 'N/A'}
                  </span>
                </div>
                {selectedLog.id && (
                  <div>
                    <div className="font-medium text-gray-500 dark:text-gray-400">Log ID</div>
                    <div className="text-gray-800 dark:text-gray-200 font-mono text-xs">{selectedLog.id}</div>
                  </div>
                )}
                {selectedLog.ip_address && (
                  <div>
                    <div className="font-medium text-gray-500 dark:text-gray-400">IP Address</div>
                    <div className="text-gray-800 dark:text-gray-200 font-mono text-xs">{selectedLog.ip_address}</div>
                  </div>
                )}
                {selectedLog.endpoint && (
                  <div>
                    <div className="font-medium text-gray-500 dark:text-gray-400">Endpoint</div>
                    <div className="text-gray-800 dark:text-gray-200 font-mono text-xs">{selectedLog.method} {selectedLog.endpoint}</div>
                  </div>
                )}
                {selectedLog.status_code && (
                  <div>
                    <div className="font-medium text-gray-500 dark:text-gray-400">Status Code</div>
                    <div className="text-gray-800 dark:text-gray-200">{selectedLog.status_code}</div>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <div className="font-medium text-gray-500 dark:text-gray-400 mb-1">Message</div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {selectedLog.message || selectedLog.details || '-'}
                </div>
              </div>
              {selectedLog.user_agent && (
                <div className="mt-4">
                  <div className="font-medium text-gray-500 dark:text-gray-400 mb-1">User Agent</div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 break-words">
                    {selectedLog.user_agent}
                  </div>
                </div>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="mt-4">
                  <div className="font-medium text-gray-500 dark:text-gray-400 mb-1">Metadata</div>
                  <pre className="p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Info note */}
      {activeTab === 'viewer' && (
        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Click on any log entry to view full details. Logs are automatically rotated based on retention settings.
        </div>
      )}

      {/* Cleanup Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal({ show: false })}
        onConfirm={executeCleanup}
        title="Clean Up Logs"
        message={`This will permanently delete logs older than ${retentionDays} days. This cannot be undone.`}
        confirmText="Delete Logs"
        cancelText="Cancel"
        variant="danger"
        loading={cleaningUp}
      />
    </div>
  );
}

LogsPanel.propTypes = {};
