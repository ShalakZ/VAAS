import { useState, useCallback } from 'react';
import { ThemeProvider, useTheme, ConfigProvider, useConfig, ToastProvider, useToast } from './context';
import { useProgress, useExportProgress } from './hooks';
import { Header, Sidebar } from './components/layout';
import { LoadingOverlay, ErrorBoundary, ToastContainer, ConfirmModal } from './components/common';
import { UploadView } from './features/upload';
import { ReviewView } from './features/review';
import { KnowledgeBaseView } from './features/knowledgebase';
import { classifyService, exportService, kbService } from './services/api';
import { calculateStats, updateStatsIncremental } from './utils/stats';
import './index.css';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { teamsList, permissions, userInfo, refreshTeams } = useConfig();
  const toast = useToast();

  // View State
  const [view, setView] = useState('upload');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data State
  const [data, setData] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);  // Preserve original column order for export
  const [stats, setStats] = useState({ total: 0, auto: 0, review: 0, fuzzy: 0 });
  const [currentFileName, setCurrentFileName] = useState('');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [error, setError] = useState(null);
  const [exportingType, setExportingType] = useState(null);

  // Progress
  const [progress, progressText] = useProgress(loading);
  const [exportProgress, setExportProgress] = useExportProgress(exportingType);

  // Knowledge Base State
  const [kbData, setKbData] = useState({ hostnames: [], titles: [], teams: [] });

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => {},
  });

  // File Upload Handler
  const handleFileUpload = useCallback(async (file) => {
    setCurrentFileName(file.name);
    setLoadingMessage('Classifying Vulnerabilities...');
    setLoading(true);
    setError(null);

    try {
      const result = await classifyService.uploadFile(file);
      setData(result.data);
      // Use column order from backend (preserves original file order)
      setColumnOrder(result.columns || []);
      setStats(calculateStats(result.data));
      setView('review');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Team Change Handler
  const handleTeamChange = useCallback((rowToUpdate, newTeam) => {
    // Find the old row state for incremental stats update
    const oldRow = rowToUpdate;
    // Keep Needs_Review true if it was true (stay in review until confirmed)
    // Mark as pending confirmation so user can confirm the change
    const newRow = {
      ...oldRow,
      Assigned_Team: newTeam,
      Needs_Review: oldRow.Needs_Review, // Keep original - don't auto-remove from review
      Pending_Confirmation: oldRow.Needs_Review && newTeam !== 'Unclassified' && newTeam !== 'Application',
      Method: 'Manual Override',
    };

    const newData = data.map(row => {
      if (row === rowToUpdate) {
        return newRow;
      }
      return row;
    });

    setData(newData);

    // Performance Optimization: Use incremental stats update instead of full recalculation
    setStats(prevStats => updateStatsIncremental(prevStats, oldRow, newRow));
  }, [data]);

  // Execute manual change confirmation (called after user confirms)
  const executeConfirmChange = useCallback(async (row) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setLoadingMessage('Confirming Assignment...');
    setLoading(true);
    try {
      // Use the same logic as fuzzy confirm - save to KB and reclassify
      const result = await kbService.confirmFuzzyMatch(row, data);

      if (result.success) {
        // Update table with reclassified data if available
        if (result.reclassifiedData && result.reclassifiedData.length > 0) {
          // Determine rule type to find matching items
          const team = row.Assigned_Team;
          const systemTeams = ['system admin', 'out of linux scope', 'out of platform scope'];
          const isSystemTeam = systemTeams.includes(team?.toLowerCase());

          // Clear Needs_Review for items that match the confirmed rule
          const updatedData = result.reclassifiedData.map(item => {
            const matches = isSystemTeam
              ? item.Title === row.Title  // Title match for system teams
              : item.hostname === row.hostname;  // Hostname match for other teams

            if (matches && item.Assigned_Team === team) {
              return {
                ...item,
                Needs_Review: false,
                Pending_Confirmation: false,
              };
            }
            return item;
          });

          setData(updatedData);
          setStats(calculateStats(updatedData));
        }
        // Refresh teams list in case new teams were added
        await refreshTeams();
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Error confirming: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [data, toast, refreshTeams]);

  // Confirm manual team change - show confirmation modal
  const handleConfirmChange = useCallback((row) => {
    const team = row.Assigned_Team;
    const systemTeams = ['system admin', 'out of linux scope', 'out of platform scope'];
    const isSystemTeam = systemTeams.includes(team?.toLowerCase());

    // Determine what will be added based on team type
    let ruleDescription;
    if (isSystemTeam) {
      ruleDescription = `Title: "${row.Title}"\nTeam: ${team}`;
    } else {
      ruleDescription = `Hostname: "${row.hostname}"\nTeam: ${team}`;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Assignment',
      message: `Save this assignment as a permanent KB rule?\n\n${ruleDescription}\n\nThis will:\n1. Add this ${isSystemTeam ? 'title' : 'hostname'} rule to the Knowledge Base\n2. Update ALL similar items in the current table`,
      variant: 'success',
      confirmText: 'Confirm & Save',
      onConfirm: () => executeConfirmChange(row),
    });
  }, [executeConfirmChange]);

  // Execute save to KB (called after confirmation)
  const executeSaveToKb = useCallback(async (hostnames, titles) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setLoadingMessage('Saving Rules to Knowledge Base...');
    setLoading(true);
    try {
      // Pass current data for re-classification
      const result = await kbService.bulkAddRules(hostnames, titles, data);

      // If we got reclassified data back, update the table
      if (result.reclassifiedData && result.reclassifiedData.length > 0) {
        // Clear Needs_Review for items that match saved hostnames or titles
        // Also clear for any item with Pending_Confirmation (user explicitly changed it)
        const savedHostnames = Object.keys(hostnames);
        const savedTitles = Object.keys(titles);

        const updatedData = result.reclassifiedData.map(item => {
          const hostnameMatch = savedHostnames.includes(item.hostname);
          const titleMatch = savedTitles.includes(item.Title);
          const isManualOverride = item.Method === 'Manual Override';

          // Clear Needs_Review if:
          // 1. Hostname matches a saved rule, OR
          // 2. Title matches a saved rule, OR
          // 3. It's a Manual Override (user explicitly changed it)
          if (hostnameMatch || titleMatch || isManualOverride) {
            return {
              ...item,
              Needs_Review: false,
              Pending_Confirmation: false,
            };
          }
          return item;
        });

        setData(updatedData);
        setStats(calculateStats(updatedData));

        // Refresh teams list in case new teams were added
        await refreshTeams();

        // Show success message with re-classification info
        const changesMsg = result.changesCount > 0
          ? ` ${result.changesCount} additional items were automatically re-classified with the new rules!`
          : ' No additional items matched the new rules.';

        toast.success(result.message + changesMsg);
      } else {
        // Refresh teams list even if no reclassification happened
        await refreshTeams();
        toast.success(result.message);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [data, toast, refreshTeams]);

  // Save to Knowledge Base - show confirmation
  const handleSaveToKb = useCallback(() => {
    const manualOverrides = data.filter(row => row.Method === 'Manual Override');

    if (manualOverrides.length === 0) {
      toast.warning('No manual corrections found to save.');
      return;
    }

    // Deduplicate Hostnames
    const uniqueHostnames = {};
    manualOverrides.forEach(row => {
      const team = row.Assigned_Team;
      if (team !== 'System Admin' && team !== 'Out of Linux Scope') {
        if (row.hostname) uniqueHostnames[row.hostname] = team;
      }
    });

    // Deduplicate Titles
    const uniqueTitles = {};
    manualOverrides.forEach(row => {
      const team = row.Assigned_Team;
      if (row.Title) {
        const directTeams = ['System Admin', 'Out of Linux Scope', 'Out of Platform Scope', 'Unclassified'];
        if (directTeams.includes(team)) {
          uniqueTitles[row.Title] = team;
        } else {
          uniqueTitles[row.Title] = 'Application';
        }
      }
    });

    const hCount = Object.keys(uniqueHostnames).length;
    const tCount = Object.keys(uniqueTitles).length;
    const hostnames = Object.entries(uniqueHostnames).map(([h, t]) => ({ hostname: h, team: t }));
    const titles = Object.entries(uniqueTitles).map(([title, t]) => ({ title, team: t }));

    setConfirmModal({
      isOpen: true,
      title: 'Save to Knowledge Base',
      message: `Found ${manualOverrides.length} corrections.\n\nExtracting:\n• ${hCount} Unique Hostnames\n• ${tCount} Unique Titles\n\nSaving to Knowledge Base will:\n1. Add these rules permanently\n2. Apply them to ALL similar items in this table\n\nThis means other rows with matching patterns will be automatically re-classified!`,
      variant: 'info',
      confirmText: 'Save Rules',
      onConfirm: () => executeSaveToKb(hostnames, titles),
    });
  }, [data, toast, executeSaveToKb]);

  // Execute fuzzy match confirmation (called after user confirms)
  const executeConfirmFuzzy = useCallback(async (row) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setLoadingMessage('Confirming Fuzzy Match...');
    setLoading(true);
    try {
      const result = await kbService.confirmFuzzyMatch(row, data);

      if (result.success) {
        // Update table with reclassified data if available
        if (result.reclassifiedData && result.reclassifiedData.length > 0) {
          setData(result.reclassifiedData);
          setStats(calculateStats(result.reclassifiedData));
        }

        // Refresh teams list in case new teams were added
        await refreshTeams();
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Error confirming rule: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [data, toast, refreshTeams]);

  // Confirm Fuzzy Match Handler - show confirmation
  const handleConfirmFuzzy = useCallback((row) => {
    if (!row || row.Method !== 'Fuzzy') {
      toast.warning('This row is not a fuzzy match.');
      return;
    }

    const team = row.Assigned_Team;
    const systemTeams = ['system admin', 'out of linux scope', 'out of platform scope'];
    const isSystemTeam = systemTeams.includes(team?.toLowerCase());

    // Determine what will be added based on team type
    let ruleDescription;
    if (isSystemTeam) {
      ruleDescription = `Title: "${row.Title}"\nTeam: ${team}`;
    } else {
      ruleDescription = `Hostname: "${row.hostname}"\nTeam: ${team}`;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Fuzzy Match',
      message: `Confirm this fuzzy match as a permanent KB rule?\n\n${ruleDescription}\n\nThis will:\n1. Add this ${isSystemTeam ? 'title' : 'hostname'} rule to the Knowledge Base\n2. Update ALL similar items in the current table`,
      variant: 'success',
      confirmText: 'Confirm Rule',
      onConfirm: () => executeConfirmFuzzy(row),
    });
  }, [toast, executeConfirmFuzzy]);

  // Export Handler
  const handleExport = useCallback(async (type) => {
    if (exportingType) return;
    setExportingType(type);

    try {
      const { blob, filename } = await exportService.exportData(data, type, columnOrder);
      setExportProgress(100);
      await new Promise(r => setTimeout(r, 200));
      exportService.downloadBlob(blob, filename);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExportingType(null);
    }
  }, [data, columnOrder, exportingType, setExportProgress, toast]);

  // Knowledge Base Handlers
  const fetchKbData = useCallback(async () => {
    setLoadingMessage('Loading Knowledge Base...');
    setLoading(true);
    try {
      const json = await kbService.getData();
      setKbData(json);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleKbNavigate = useCallback(() => {
    setView('kb');
    fetchKbData();
  }, [fetchKbData]);

  const handleAddRule = useCallback(async (type, key, team) => {
    try {
      const result = await kbService.addRule(type, key, team);
      if (result.success) {
        toast.success('Rule Added! (Note: Restart app to apply to new uploads)');
        fetchKbData();
        // Refresh teams dropdown in case a new team was added
        await refreshTeams();
        return true;
      } else {
        toast.error(result.message);
        return false;
      }
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  }, [fetchKbData, toast, refreshTeams]);

  const handleEditRule = useCallback(async (type, oldKey, newKey, newTeam) => {
    try {
      const result = await kbService.editRule(type, oldKey, newKey, newTeam);
      if (result.success) {
        toast.success('Rule Updated!');
        fetchKbData();
        // Refresh teams dropdown in case team was changed
        await refreshTeams();
        return true;
      } else {
        toast.error(result.message);
        return false;
      }
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  }, [fetchKbData, toast, refreshTeams]);

  // Execute delete rule (called after user confirms)
  const executeDeleteRule = useCallback(async (type, key) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      const result = await kbService.deleteRule(type, key);
      if (result.success) {
        toast.success('Rule Deleted!');
        fetchKbData();
        // Refresh teams dropdown in case a team was removed
        await refreshTeams();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  }, [fetchKbData, toast, refreshTeams]);

  // Delete rule handler (direct execution without confirm modal)
  const handleDeleteRule = useCallback(async (type, key) => {
    await executeDeleteRule(type, key);
  }, [executeDeleteRule]);

  // Confirm delete handler - show confirmation modal
  const handleConfirmDeleteRule = useCallback((type, key) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Rule',
      message: `Are you sure you want to delete this rule?\n\n${key}`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: () => executeDeleteRule(type, key),
    });
  }, [executeDeleteRule]);

  const handleKbUpload = useCallback(async (file) => {
    setLoading(true);
    try {
      const result = await kbService.importKb(file);
      toast.success(result.message + ' Page will reload to reflect changes.');
      setTimeout(() => globalThis.location.reload(), 1500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Execute new analysis (called after user confirms)
  const executeNewAnalysis = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setData([]);
    setStats({ total: 0, auto: 0, review: 0, fuzzy: 0 });
    setView('upload');
    setCurrentFileName('');
  }, []);

  // New Analysis Handler - show confirmation
  const handleNewAnalysis = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Start New Analysis',
      message: 'Start a new analysis? Current results will be lost.',
      variant: 'warning',
      confirmText: 'Start New',
      onConfirm: executeNewAnalysis,
    });
  }, [executeNewAnalysis]);

  return (
    <div className="min-h-screen p-8 transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        toggleTheme={toggleTheme}
        onNavigate={(v) => {
          if (v === 'kb') handleKbNavigate();
          else setView(v);
        }}
        hasData={data.length > 0}
        userInfo={userInfo}
      />

      <Header
        view={view}
        setView={setView}
        currentFileName={currentFileName}
        hasData={data.length > 0}
        theme={theme}
        toggleTheme={toggleTheme}
        onSidebarOpen={() => setSidebarOpen(true)}
        onNewAnalysis={handleNewAnalysis}
        onKbClick={handleKbNavigate}
        exportProgress={exportProgress}
      />

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {view === 'upload' && (
        <UploadView
          loading={loading}
          progress={progress}
          progressText={progressText}
          onFileUpload={handleFileUpload}
        />
      )}

      {view === 'review' && (
        <ReviewView
          data={data}
          stats={stats}
          columnOrder={columnOrder}
          onTeamChange={handleTeamChange}
          onConfirmChange={handleConfirmChange}
          onSaveToKb={handleSaveToKb}
          onConfirmFuzzy={handleConfirmFuzzy}
          onExport={handleExport}
          exportingType={exportingType}
          exportProgress={exportProgress}
          teamsList={teamsList}
          permissions={permissions}
        />
      )}

      {view === 'kb' && (
        <KnowledgeBaseView
          kbData={kbData}
          loading={loading}
          onAddRule={handleAddRule}
          onEditRule={handleEditRule}
          onDeleteRule={handleDeleteRule}
          onConfirmDelete={handleConfirmDeleteRule}
          teamsList={teamsList}
          canModifyKb={permissions.canModifyKb}
        />
      )}

      {/* Loading Overlay - shows during KB operations (not during file upload which has its own UI) */}
      <LoadingOverlay show={loading && view !== 'upload'} message={loadingMessage} />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}

function App() {
  // Get config from globalThis if available (set by Flask template)
  const config = globalThis.__VAAS_CONFIG__ || {};

  return (
    <ErrorBoundary>
      <ConfigProvider config={config}>
        <ThemeProvider>
          <ToastProvider>
            <AppContent />
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
