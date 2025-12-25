import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, ConfirmModal } from '../../../components/common';
import { useToast } from '../../../context';
import { ActionIcon } from '../components';

/**
 * Knowledge Base settings panel for managing rules and database maintenance
 */
export function KnowledgeBaseSettingsPanel() {
  const toast = useToast();
  const [kbStats, setKbStats] = useState({ hostnames: 0, titles: 0, lastUpdated: null });
  const [dbStats, setDbStats] = useState({ total_reports: 0, total_items: 0, db_size_mb: 0, avg_items: 0, duplicates: 0 });
  const [schedulerStatus, setSchedulerStatus] = useState({ enabled: false, running: false, last_cleanup: null, next_cleanup: null });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importMode, setImportMode] = useState('merge');

  // Cleanup state
  const [cleaningKb, setCleaningKb] = useState(false);
  const [deletingOld, setDeletingOld] = useState(false);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [runningFullMaintenance, setRunningFullMaintenance] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);

  // Scheduler state
  const [schedulerSettings, setSchedulerSettings] = useState({
    enabled: false,
    interval_days: 7,
    retention_days: 90,
  });
  const [savingScheduler, setSavingScheduler] = useState(false);
  const [runningScheduler, setRunningScheduler] = useState(false);

  // Confirm modal state for various actions
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    action: null,
    title: '',
    message: '',
    variant: 'warning',
    pendingFile: null,
  });

  useEffect(() => {
    fetchKbStats();
    fetchDbStats();
    fetchSchedulerStatus();
  }, []);

  const fetchKbStats = async () => {
    try {
      const res = await fetch('/kb/data');
      const data = await res.json();
      if (data) {
        setKbStats({
          hostnames: data.hostnames?.length || 0,
          titles: data.titles?.length || 0,
          lastUpdated: new Date().toLocaleDateString(),
        });
      }
    } catch (err) {
      console.error('Failed to load KB stats');
    }
  };

  const fetchDbStats = async () => {
    try {
      const res = await fetch('/api/db/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setDbStats({
          total_reports: data.stats.total_reports || 0,
          total_items: data.stats.total_items || data.stats.total_report_items || 0,
          db_size_mb: data.stats.db_size_mb || data.stats.database_size_mb || 0,
          avg_items: data.stats.avg_items || data.stats.avg_items_per_report || 0,
          duplicates: data.stats.duplicates || 0,
        });
      } else if (data.stats) {
        setDbStats({
          total_reports: data.stats.total_reports || 0,
          total_items: data.stats.total_items || data.stats.total_report_items || 0,
          db_size_mb: data.stats.db_size_mb || data.stats.database_size_mb || 0,
          avg_items: data.stats.avg_items || data.stats.avg_items_per_report || 0,
          duplicates: data.stats.duplicates || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load DB stats:', err);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const res = await fetch('/api/scheduler/status');
      const data = await res.json();
      if (data.success && data.status) {
        setSchedulerStatus(data.status);
        setSchedulerSettings({
          enabled: data.status.enabled || false,
          interval_days: data.status.interval_days || 7,
          retention_days: data.status.retention_days || 90,
        });
      }
    } catch (err) {
      console.error('Failed to load scheduler status');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/kb/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'knowledge_base_export.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Knowledge Base exported successfully');
      } else {
        toast.error('Export failed');
      }
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const warning = importMode === 'replace'
      ? 'Replace mode will DELETE all existing rules before importing. This cannot be undone.'
      : 'This will merge new rules with existing ones. Duplicates will be skipped.';

    setConfirmModal({
      show: true,
      action: 'import',
      title: importMode === 'replace' ? 'Replace Knowledge Base' : 'Import Knowledge Base',
      message: warning,
      variant: importMode === 'replace' ? 'danger' : 'warning',
      pendingFile: file,
    });
    e.target.value = '';
  };

  const executeImport = async (file) => {
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', importMode);

    try {
      const res = await fetch('/kb/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Import successful');
        fetchKbStats();
      } else {
        toast.error(data.message || 'Import failed');
      }
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleKbCleanup = () => {
    setConfirmModal({
      show: true,
      action: 'kbCleanup',
      title: 'Clean KB Entries',
      message: 'This will remove duplicate and orphaned KB entries. Continue?',
      variant: 'warning',
      pendingFile: null,
    });
  };

  const executeKbCleanup = async () => {
    setCleaningKb(true);
    try {
      const res = await fetch('/api/db/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_duplicates: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'KB cleanup completed');
        fetchKbStats();
        fetchDbStats();
      } else {
        toast.error(data.message || 'Cleanup failed');
      }
    } catch (err) {
      toast.error('Cleanup failed');
    } finally {
      setCleaningKb(false);
    }
  };

  const handleDeleteOldReports = () => {
    setConfirmModal({
      show: true,
      action: 'deleteOld',
      title: 'Delete Old Reports',
      message: `Delete reports older than ${retentionDays} days? This cannot be undone.`,
      variant: 'danger',
      pendingFile: null,
    });
  };

  const executeDeleteOldReports = async () => {
    setDeletingOld(true);
    try {
      const res = await fetch('/api/db/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_old: true, retention_days: retentionDays }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted ${data.deleted_reports || 0} old reports`);
        fetchDbStats();
      } else {
        toast.error(data.message || 'Delete failed');
      }
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setDeletingOld(false);
    }
  };

  const handleRemoveDuplicates = () => {
    setConfirmModal({
      show: true,
      action: 'removeDuplicates',
      title: 'Remove Duplicates',
      message: 'Remove duplicate reports? This cannot be undone.',
      variant: 'warning',
      pendingFile: null,
    });
  };

  const executeRemoveDuplicates = async () => {
    setRemovingDuplicates(true);
    try {
      const res = await fetch('/api/db/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_duplicates: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Removed ${data.duplicates_removed || 0} duplicates`);
        fetchDbStats();
      } else {
        toast.error(data.message || 'Remove failed');
      }
    } catch (err) {
      toast.error('Remove failed');
    } finally {
      setRemovingDuplicates(false);
    }
  };

  const handleOptimizeDb = async () => {
    setOptimizing(true);
    try {
      const res = await fetch('/api/db/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacuum: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Database optimized successfully');
        fetchDbStats();
      } else {
        toast.error(data.message || 'Optimize failed');
      }
    } catch (err) {
      toast.error('Optimize failed');
    } finally {
      setOptimizing(false);
    }
  };

  const handleFullMaintenance = () => {
    setConfirmModal({
      show: true,
      action: 'fullMaintenance',
      title: 'Full Database Maintenance',
      message: `This will:\n\n1. Delete reports older than ${retentionDays} days\n2. Remove duplicate report entries\n3. Optimize database storage\n\nThis cannot be undone.`,
      variant: 'danger',
      pendingFile: null,
    });
  };

  const executeFullMaintenance = async () => {
    setRunningFullMaintenance(true);
    let results = { deleted: 0, duplicates: 0, optimized: false };
    let errors = [];

    try {
      // Step 1: Delete old reports (match handleDeleteOldReports params)
      try {
        const res = await fetch('/api/db/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delete_old: true, retention_days: retentionDays }),
        });
        const data = await res.json();
        if (data.success) {
          results.deleted = data.deleted_reports || 0;
        } else {
          errors.push('Delete old reports failed');
        }
      } catch {
        errors.push('Delete old reports failed');
      }

      // Step 2: Remove duplicates (match handleRemoveDuplicates params)
      try {
        const res = await fetch('/api/db/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delete_duplicates: true }),
        });
        const data = await res.json();
        if (data.success) {
          results.duplicates = data.duplicates_removed || 0;
        } else {
          errors.push('Remove duplicates failed');
        }
      } catch {
        errors.push('Remove duplicates failed');
      }

      // Step 3: Optimize DB (match handleOptimizeDb params)
      try {
        const res = await fetch('/api/db/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vacuum: true }),
        });
        const data = await res.json();
        if (data.success) {
          results.optimized = true;
        } else {
          errors.push('Optimize failed');
        }
      } catch {
        errors.push('Optimize failed');
      }

      // Show summary
      if (errors.length === 0) {
        toast.success(`Maintenance complete: ${results.deleted} old reports removed, ${results.duplicates} duplicates removed, database optimized`);
      } else if (errors.length < 3) {
        toast.success(`Partial success: ${results.deleted} reports removed, ${results.duplicates} duplicates removed. Some steps had errors.`);
      } else {
        toast.error('Maintenance failed - all operations encountered errors');
      }

      fetchDbStats();
    } finally {
      setRunningFullMaintenance(false);
    }
  };

  const handleSaveScheduler = async () => {
    setSavingScheduler(true);
    try {
      const res = await fetch('/api/scheduler/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedulerSettings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Scheduler settings saved');
        fetchSchedulerStatus();
      } else {
        toast.error(data.message || 'Save failed');
      }
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSavingScheduler(false);
    }
  };

  const handleRunSchedulerNow = () => {
    setConfirmModal({
      show: true,
      action: 'runScheduler',
      title: 'Run Cleanup Now',
      message: 'Run cleanup now? This will delete old reports based on retention settings.',
      variant: 'warning',
      pendingFile: null,
    });
  };

  const executeRunSchedulerNow = async () => {
    setRunningScheduler(true);
    try {
      const res = await fetch('/api/scheduler/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Cleanup complete. Deleted ${data.deleted_reports || 0} reports.`);
        fetchDbStats();
        fetchSchedulerStatus();
      } else {
        toast.error(data.message || 'Cleanup failed');
      }
    } catch (err) {
      toast.error('Cleanup failed');
    } finally {
      setRunningScheduler(false);
    }
  };

  const handleConfirmAction = async () => {
    const action = confirmModal.action;
    const pendingFile = confirmModal.pendingFile;

    setConfirmModal({ show: false, action: null, title: '', message: '', variant: 'warning', pendingFile: null });

    switch (action) {
      case 'import':
        if (pendingFile) await executeImport(pendingFile);
        break;
      case 'kbCleanup':
        await executeKbCleanup();
        break;
      case 'deleteOld':
        await executeDeleteOldReports();
        break;
      case 'removeDuplicates':
        await executeRemoveDuplicates();
        break;
      case 'fullMaintenance':
        await executeFullMaintenance();
        break;
      case 'runScheduler':
        await executeRunSchedulerNow();
        break;
    }
  };

  return (
    <div className="p-5 space-y-5 overflow-auto">
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">Knowledge Base Settings</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Import, export, and maintain the classification rules database</p>
      </div>

      {/* KB Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card settings-section p-3 text-center">
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{kbStats.hostnames.toLocaleString()}</div>
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">Hostname Rules</div>
        </div>
        <div className="stat-card settings-section p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{kbStats.titles.toLocaleString()}</div>
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">Title Rules</div>
        </div>
        <div className="stat-card settings-section p-3 text-center">
          <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{(kbStats.hostnames + kbStats.titles).toLocaleString()}</div>
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">Total Rules</div>
        </div>
      </div>

      {/* Import/Export */}
      <div className="settings-section p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Import & Export</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export */}
          <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-lg border border-sky-200 dark:border-sky-800 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                <ActionIcon type="download" className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <h5 className="font-semibold text-gray-800 dark:text-white text-sm">Export</h5>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex-1">Download all rules as Excel file for backup or migration.</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all btn-lift bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Exporting...</>
              ) : (
                <><ActionIcon type="download" className="w-4 h-4" /> Export to Excel</>
              )}
            </button>
          </div>

          {/* Import */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <ActionIcon type="upload" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h5 className="font-semibold text-gray-800 dark:text-white text-sm">Import</h5>
            </div>

            {/* Import Mode */}
            <div className="mb-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg flex-1">
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="importMode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-xs text-gray-700 dark:text-gray-300"><strong>Merge</strong> <span className="text-gray-500">(safe)</span></span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="w-3.5 h-3.5 text-red-600 focus:ring-red-500" />
                  <span className="text-xs text-gray-700 dark:text-gray-300"><strong>Replace</strong> <span className="text-gray-500">(overwrite)</span></span>
                </label>
              </div>
            </div>

            <label className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all btn-lift flex items-center justify-center gap-2 cursor-pointer ${
              importing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : importMode === 'replace'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}>
              {importing ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Importing...</>
              ) : (
                <><ActionIcon type="upload" className="w-4 h-4" /> Import from Excel</>
              )}
              <input type="file" accept=".xlsx" onChange={handleImport} disabled={importing} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Database Maintenance */}
      <div className="settings-section p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Report Database</h4>
        </div>

        {/* Report Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="stat-card p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 text-center">
            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{dbStats.total_reports || 0}</div>
            <div className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Reports</div>
          </div>
          <div className="stat-card p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 text-center">
            <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{dbStats.total_items || 0}</div>
            <div className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Items</div>
          </div>
          <div className="stat-card p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800 text-center">
            <div className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{(dbStats.db_size_mb || 0).toFixed(2)} MB</div>
            <div className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">DB Size</div>
          </div>
          <div className="stat-card p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
            <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{dbStats.avg_items || 0}</div>
            <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Avg/Report</div>
          </div>
        </div>

        {dbStats.duplicates > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-orange-700 dark:text-orange-300">
              {dbStats.duplicates} duplicate reports detected. Use "Remove Duplicates" or "Full Maintenance" to clean up.
            </span>
          </div>
        )}

        {/* Maintenance Actions */}
        <div className="settings-section p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h5 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Maintenance Actions</h5>
            </div>
          </div>

          {/* Full Maintenance - Primary Action */}
          <div className="p-3 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h6 className="font-semibold text-gray-800 dark:text-white text-sm mb-0.5">Full Database Maintenance</h6>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Runs all cleanup tasks: deletes old reports ({retentionDays}+ days), removes duplicates, and optimizes storage.
                </p>
                <Button
                  variant="primary"
                  onClick={handleFullMaintenance}
                  disabled={runningFullMaintenance || deletingOld || removingDuplicates || optimizing}
                  className="btn-lift"
                >
                  {runningFullMaintenance ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>Running...</>
                  ) : (
                    <><ActionIcon type="bolt" className="w-4 h-4 inline mr-1" />Run Full Maintenance</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Individual Actions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Or run individual actions:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Delete Old Reports */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 dark:text-white text-xs">Delete Old Reports</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Remove reports older than selected period</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                    className="border dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  >
                    <option value="30">30d</option>
                    <option value="60">60d</option>
                    <option value="90">90d</option>
                    <option value="180">180d</option>
                    <option value="365">1yr</option>
                  </select>
                  <Button variant="secondary" size="sm" onClick={handleDeleteOldReports} disabled={deletingOld || runningFullMaintenance}>
                    {deletingOld ? '...' : <ActionIcon type="trash" className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Remove Duplicates */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 dark:text-white text-xs">Remove Duplicates</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Find and delete duplicate report entries</div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleRemoveDuplicates} disabled={removingDuplicates || runningFullMaintenance}>
                  {removingDuplicates ? '...' : <ActionIcon type="refresh" className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {/* Optimize DB */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 dark:text-white text-xs">Optimize Database</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Reclaim disk space and improve performance</div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleOptimizeDb} disabled={optimizing || runningFullMaintenance}>
                  {optimizing ? '...' : <ActionIcon type="bolt" className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {/* Clean KB Entries */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 dark:text-white text-xs">Clean KB Entries</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Remove orphaned/duplicate KB rules</div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleKbCleanup} disabled={cleaningKb || runningFullMaintenance}>
                  {cleaningKb ? '...' : <ActionIcon type="broom" className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automatic Cleanup Scheduler */}
      <div className="settings-section p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Automatic Cleanup</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className={`settings-badge px-2 py-0.5 rounded ${
              schedulerStatus.running ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              schedulerStatus.enabled ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {schedulerStatus.running ? 'Running' : schedulerStatus.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={schedulerSettings.enabled} onChange={(e) => setSchedulerSettings(s => ({ ...s, enabled: e.target.checked }))} className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-sky-500"></div>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {schedulerStatus.last_cleanup && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Last:</span> {new Date(schedulerStatus.last_cleanup).toLocaleDateString()}
            </div>
          )}
          {schedulerStatus.next_cleanup && schedulerStatus.enabled && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Next:</span> {new Date(schedulerStatus.next_cleanup).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Interval</label>
              <select value={schedulerSettings.interval_days} onChange={(e) => setSchedulerSettings(s => ({ ...s, interval_days: parseInt(e.target.value) }))} className="settings-input border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                <option value="1">Daily</option>
                <option value="3">Every 3 days</option>
                <option value="7">Weekly</option>
                <option value="14">Every 2 weeks</option>
                <option value="30">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Keep reports for</label>
              <select value={schedulerSettings.retention_days} onChange={(e) => setSchedulerSettings(s => ({ ...s, retention_days: parseInt(e.target.value) }))} className="settings-input border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">6 months</option>
                <option value="365">1 year</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleSaveScheduler} disabled={savingScheduler} className="btn-lift">
                {savingScheduler ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant="secondary" onClick={handleRunSchedulerNow} disabled={runningScheduler} className="btn-lift">
                {runningScheduler ? 'Running...' : <><ActionIcon type="play" className="w-4 h-4 inline mr-1" />Run Now</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="settings-info-box p-4 pl-5 bg-sky-50/50 dark:bg-sky-900/10 rounded-lg border border-sky-100 dark:border-sky-800/30">
        <h4 className="font-semibold text-sky-800 dark:text-sky-300 mb-2 text-xs uppercase tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          About Knowledge Base
        </h4>
        <ul className="text-xs text-sky-700/80 dark:text-sky-400/80 space-y-1">
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-sky-500 mt-1.5 flex-shrink-0"></span>
            <span><strong>Hostname Rules:</strong> Map specific hosts to teams (e.g., "db-server-01" to "Database Team")</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-sky-500 mt-1.5 flex-shrink-0"></span>
            <span><strong>Title Rules:</strong> Map vulnerability titles to categories (e.g., "SQL Injection" to "Application")</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-sky-500 mt-1.5 flex-shrink-0"></span>
            <span>Rules are applied in priority order during classification. Manual overrides take precedence.</span>
          </li>
        </ul>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal({ show: false, action: null, title: '', message: '', variant: 'warning', pendingFile: null })}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Continue"
        cancelText="Cancel"
        variant={confirmModal.variant}
      />
    </div>
  );
}

KnowledgeBaseSettingsPanel.propTypes = {};
