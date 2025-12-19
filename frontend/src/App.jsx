import { useState, useCallback } from 'react';
import { ThemeProvider, useTheme, ConfigProvider, useConfig } from './context';
import { useProgress, useExportProgress } from './hooks';
import { Header, Sidebar } from './components/layout';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { UploadView } from './features/upload';
import { ReviewView } from './features/review';
import { KnowledgeBaseView } from './features/knowledgebase';
import { classifyService, exportService, kbService } from './services/api';
import { calculateStats, updateStatsIncremental } from './utils/stats';
import './index.css';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { teamsList, permissions, userInfo } = useConfig();

  // View State
  const [view, setView] = useState('upload');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data State
  const [data, setData] = useState([]);
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

  // File Upload Handler
  const handleFileUpload = useCallback(async (file) => {
    setCurrentFileName(file.name);
    setLoadingMessage('Classifying Vulnerabilities...');
    setLoading(true);
    setError(null);

    try {
      const jsonData = await classifyService.uploadFile(file);
      setData(jsonData);
      setStats(calculateStats(jsonData));
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
    const needsReview = newTeam === 'Unclassified' || newTeam === 'Application';
    const newRow = {
      ...oldRow,
      Assigned_Team: newTeam,
      Needs_Review: needsReview,
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

  // Save to Knowledge Base
  const handleSaveToKb = useCallback(async () => {
    const manualOverrides = data.filter(row => row.Method === 'Manual Override');

    if (manualOverrides.length === 0) {
      return alert('No manual corrections found to save.');
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

    // Updated confirmation message explaining re-classification
    const confirmMessage = `Found ${manualOverrides.length} corrections.\n\nExtracting:\n• ${hCount} Unique Hostnames\n• ${tCount} Unique Titles\n\nSaving to Knowledge Base will:\n1. Add these rules permanently\n2. Apply them to ALL similar items in this table\n\nThis means other rows with matching patterns will be automatically re-classified!\n\nProceed?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    const hostnames = Object.entries(uniqueHostnames).map(([h, t]) => ({ hostname: h, team: t }));
    const titles = Object.entries(uniqueTitles).map(([title, t]) => ({ title, team: t }));

    setLoadingMessage('Saving Rules to Knowledge Base...');
    setLoading(true);
    try {
      // Pass current data for re-classification
      const result = await kbService.bulkAddRules(hostnames, titles, data);

      // If we got reclassified data back, update the table
      if (result.reclassifiedData && result.reclassifiedData.length > 0) {
        setData(result.reclassifiedData);
        setStats(calculateStats(result.reclassifiedData));

        // Show success message with re-classification info
        const changesMsg = result.changesCount > 0
          ? `\n\n${result.changesCount} additional items were automatically re-classified with the new rules!`
          : '\n\nNo additional items matched the new rules.';

        alert(result.message + changesMsg);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, [data]);

  // Confirm Fuzzy Match Handler
  const handleConfirmFuzzy = useCallback(async (row) => {
    if (!row || row.Method !== 'Fuzzy') {
      return alert('This row is not a fuzzy match.');
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

    const confirmMsg = `Confirm this fuzzy match as a permanent KB rule?\n\n${ruleDescription}\n\nThis will:\n1. Add this ${isSystemTeam ? 'title' : 'hostname'} rule to the Knowledge Base\n2. Update ALL similar items in the current table`;

    if (!confirm(confirmMsg)) {
      return;
    }

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

        alert(`✓ ${result.message}`);
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      alert('Error confirming rule: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [data]);

  // Export Handler
  const handleExport = useCallback(async (type) => {
    if (exportingType) return;
    setExportingType(type);

    try {
      const { blob, filename } = await exportService.exportData(data, type);
      setExportProgress(100);
      await new Promise(r => setTimeout(r, 200));
      exportService.downloadBlob(blob, filename);
    } catch (err) {
      alert(err.message);
    } finally {
      setExportingType(null);
    }
  }, [data, exportingType, setExportProgress]);

  // Knowledge Base Handlers
  const fetchKbData = useCallback(async () => {
    setLoadingMessage('Loading Knowledge Base...');
    setLoading(true);
    try {
      const json = await kbService.getData();
      setKbData(json);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKbNavigate = useCallback(() => {
    setView('kb');
    fetchKbData();
  }, [fetchKbData]);

  const handleAddRule = useCallback(async (type, key, team) => {
    try {
      const result = await kbService.addRule(type, key, team);
      if (result.success) {
        alert('Rule Added! (Note: Restart app to apply to new uploads)');
        fetchKbData();
        return true;
      } else {
        alert('Error: ' + result.message);
        return false;
      }
    } catch (err) {
      alert(err.message);
      return false;
    }
  }, [fetchKbData]);

  const handleEditRule = useCallback(async (type, oldKey, newKey, newTeam) => {
    try {
      const result = await kbService.editRule(type, oldKey, newKey, newTeam);
      if (result.success) {
        alert('Rule Updated!');
        fetchKbData();
        return true;
      } else {
        alert('Error: ' + result.message);
        return false;
      }
    } catch (err) {
      alert(err.message);
      return false;
    }
  }, [fetchKbData]);

  const handleDeleteRule = useCallback(async (type, key) => {
    try {
      const result = await kbService.deleteRule(type, key);
      if (result.success) {
        alert('Rule Deleted!');
        fetchKbData();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      alert(err.message);
    }
  }, [fetchKbData]);

  const handleKbUpload = useCallback(async (file) => {
    setLoading(true);
    try {
      const result = await kbService.importKb(file);
      alert(result.message + '\n\nPage will reload to reflect changes.');
      globalThis.location.reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // New Analysis Handler
  const handleNewAnalysis = useCallback(() => {
    if (confirm('Start a new analysis? Current results will be lost.')) {
      setData([]);
      setStats({ total: 0, auto: 0, review: 0, fuzzy: 0 });
      setView('upload');
      setCurrentFileName('');
    }
  }, []);

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
          onTeamChange={handleTeamChange}
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
          teamsList={teamsList}
          canModifyKb={permissions.canModifyKb}
        />
      )}

      {/* Loading Overlay - shows during KB operations (not during file upload which has its own UI) */}
      <LoadingOverlay show={loading && view !== 'upload'} message={loadingMessage} />
    </div>
  );
}

function App() {
  // Get config from globalThis if available (set by Flask template)
  const config = globalThis.__VAAS_CONFIG__ || {};

  return (
    <ConfigProvider config={config}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ConfigProvider>
  );
}

export default App;
