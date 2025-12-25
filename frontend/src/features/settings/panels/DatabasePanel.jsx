import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Input, ConfirmModal } from '../../../components/common';
import { useToast } from '../../../context';

const DEFAULT_PORTS = {
  mysql: '3306',
  postgresql: '5432',
  mssql: '1433',
  azuresql: '1433',
};

/**
 * Database configuration panel for managing storage backend
 */
export function DatabasePanel() {
  const toast = useToast();
  const [settings, setSettings] = useState({
    db_type: 'sqlite',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    ssl_enabled: false,
    ssl_mode: 'require',
    ssl_ca_cert: '',
    trust_server_certificate: false,
    azure_ad_auth: false,
    connection_timeout: 30,
  });
  const [dbInfo, setDbInfo] = useState({ type: 'sqlite', connected: true });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [preserveSqlite, setPreserveSqlite] = useState(true);
  const [originalDbType, setOriginalDbType] = useState('sqlite');
  const [confirmModal, setConfirmModal] = useState({ show: false });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/database/settings');
      const data = await res.json();
      if (data.success) {
        if (data.settings) {
          setSettings(s => ({ ...s, ...data.settings }));
          setOriginalDbType(data.settings.db_type || 'sqlite');
        }
        if (data.db_info) setDbInfo(data.db_info);
      }
    } catch (err) {
      console.error('Failed to load database settings');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Connection successful');
      } else {
        toast.error(data.message || 'Connection failed');
      }
    } catch (err) {
      toast.error('Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/database/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved');
        setOriginalDbType(settings.db_type);
      } else {
        toast.error(data.message || 'Save failed');
      }
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = () => {
    setConfirmModal({ show: true });
  };

  const executeMigrate = async () => {
    setConfirmModal({ show: false });
    setMigrating(true);
    try {
      const res = await fetch('/api/database/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          preserve_sqlite: preserveSqlite,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Migration completed successfully');
        fetchSettings();
      } else {
        toast.error(data.message || 'Migration failed');
      }
    } catch (err) {
      toast.error('Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  const updateField = (field, value) => {
    setSettings(s => {
      const newSettings = { ...s, [field]: value };
      // Auto-fill port when changing db_type
      if (field === 'db_type' && value !== 'sqlite' && !s.port) {
        newSettings.port = DEFAULT_PORTS[value] || '';
      }
      return newSettings;
    });
  };

  const showMigrationSection = originalDbType === 'sqlite' && settings.db_type !== 'sqlite';
  const isAzure = settings.db_type === 'azuresql';
  const isMssql = settings.db_type === 'mssql' || isAzure;
  const isPostgres = settings.db_type === 'postgresql';

  return (
    <div className="p-5 space-y-5 min-h-[400px]">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">Database Settings</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure the data storage backend for VAAS</p>
        </div>
        {/* Current Status */}
        <div className="settings-section flex items-center gap-2.5 px-3 py-2">
          <span className={`w-2 h-2 rounded-full ${dbInfo.connected !== false ? 'bg-emerald-500 status-pulse' : 'bg-red-500'}`}></span>
          <div className="text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{dbInfo.type?.toUpperCase() || 'SQLite'}</span>
            {dbInfo.version && <span className="text-gray-400 dark:text-gray-500 ml-1">v{dbInfo.version}</span>}
          </div>
          <span className={`settings-badge px-2 py-0.5 rounded-md ${dbInfo.connected !== false ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'}`}>
            {dbInfo.connected !== false ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Database Type */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Database Type</label>
        <select
          value={settings.db_type}
          onChange={(e) => updateField('db_type', e.target.value)}
          className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="sqlite">SQLite (Built-in)</option>
          <option value="mysql">MySQL / MariaDB</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mssql">SQL Server</option>
          <option value="azuresql">Azure SQL</option>
        </select>
      </div>

      {settings.db_type === 'sqlite' ? (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1 text-sm">SQLite (Default)</h4>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Built-in database, requires no configuration. <strong>File:</strong> data/knowledge_base.db
          </p>
        </div>
      ) : (
        <>
          {/* Connection Settings */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 pb-1 text-sm">Connection</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Host / Server *</label>
                <Input
                  value={settings.host}
                  onChange={(e) => updateField('host', e.target.value)}
                  placeholder={isAzure ? 'yourserver.database.windows.net' : 'localhost'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                <Input
                  value={settings.port}
                  onChange={(e) => updateField('port', e.target.value)}
                  placeholder={DEFAULT_PORTS[settings.db_type] || 'Auto'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Database *</label>
                <Input
                  value={settings.database}
                  onChange={(e) => updateField('database', e.target.value)}
                  placeholder="vaas_db"
                />
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 pb-1 text-sm">Authentication</h4>

            {isAzure && (
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  checked={settings.azure_ad_auth}
                  onChange={(e) => updateField('azure_ad_auth', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <div>
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Use Azure AD Authentication</span>
                </div>
              </label>
            )}

            {(!isAzure || !settings.azure_ad_auth) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
                  <Input
                    value={settings.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="vaas_user"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <Input
                    type="password"
                    value={settings.password}
                    onChange={(e) => updateField('password', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Security / SSL */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 pb-1 text-sm">Security</h4>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ssl_enabled}
                  onChange={(e) => updateField('ssl_enabled', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">Enable SSL/TLS</span>
              </label>

              {settings.ssl_enabled && isMssql && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.trust_server_certificate}
                    onChange={(e) => updateField('trust_server_certificate', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Trust Server Certificate</span>
                </label>
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-700 dark:text-gray-300">Timeout:</label>
                <Input
                  type="number"
                  value={settings.connection_timeout}
                  onChange={(e) => updateField('connection_timeout', parseInt(e.target.value) || 30)}
                  placeholder="30"
                  min="5"
                  max="300"
                  className="w-16"
                />
                <span className="text-xs text-gray-500">sec</span>
              </div>
            </div>

            {settings.ssl_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                {isPostgres && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">SSL Mode</label>
                    <select
                      value={settings.ssl_mode}
                      onChange={(e) => updateField('ssl_mode', e.target.value)}
                      className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                    >
                      <option value="require">Require</option>
                      <option value="verify-ca">Verify CA</option>
                      <option value="verify-full">Verify Full</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CA Cert Path (Optional)</label>
                  <Input
                    value={settings.ssl_ca_cert}
                    onChange={(e) => updateField('ssl_ca_cert', e.target.value)}
                    placeholder="/path/to/ca-cert.pem"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Migration Section */}
          {showMigrationSection && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2 text-sm">Data Migration</h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-3">
                Migrate your existing SQLite data to the new database.
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveSqlite}
                    onChange={(e) => setPreserveSqlite(e.target.checked)}
                    className="w-4 h-4 rounded text-yellow-600"
                  />
                  <span className="text-xs text-yellow-700 dark:text-yellow-300">Keep SQLite as backup</span>
                </label>
                <Button
                  variant="secondary"
                  onClick={handleMigrate}
                  disabled={migrating || !settings.host || !settings.database}
                >
                  {migrating ? 'Migrating...' : 'Migrate Data'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t dark:border-gray-700">
        {settings.db_type !== 'sqlite' && (
          <Button variant="secondary" onClick={handleTest} disabled={testing || !settings.host}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Migration Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal({ show: false })}
        onConfirm={executeMigrate}
        title="Migrate Database"
        message="This will migrate all data from SQLite to the new database. This operation may take a few minutes and cannot be interrupted."
        confirmText="Start Migration"
        cancelText="Cancel"
        variant="warning"
        loading={migrating}
      />
    </div>
  );
}

DatabasePanel.propTypes = {};
