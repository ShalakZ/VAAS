import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Input } from '../../../components/common';
import { useToast } from '../../../context';

/**
 * LDAP/Active Directory settings panel for configuring authentication
 */
export function LdapPanel() {
  const toast = useToast();
  const [settings, setSettings] = useState({
    enabled: false,
    host: '',
    port: '389',
    use_ssl: false,
    base_dn: '',
    service_user: '',
    service_pass: '',
    user_filter: '(sAMAccountName={username})',
    admin_group: '',
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/ldap/settings');
      const data = await res.json();
      if (data) {
        const mapped = {
          enabled: data.LDAP_ENABLED || data.enabled || false,
          host: data.LDAP_HOST || data.host || '',
          port: data.LDAP_PORT || data.port || '389',
          use_ssl: data.LDAP_USE_SSL || data.use_ssl || false,
          base_dn: data.LDAP_BASE_DN || data.base_dn || '',
          service_user: data.LDAP_SERVICE_USER || data.service_user || '',
          service_pass: data.LDAP_SERVICE_PASS || data.service_pass || '',
          user_filter: data.LDAP_USER_FILTER || data.user_filter || '(sAMAccountName={username})',
          admin_group: data.LDAP_ADMIN_GROUP || data.admin_group || '',
        };
        setSettings(s => ({ ...s, ...mapped }));
      }
    } catch (err) {
      console.error('Failed to load LDAP settings');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const res = await fetch('/api/ldap/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Connection successful');
        setConnectionStatus('success');
      } else {
        toast.error(data.message || 'Connection failed');
        setConnectionStatus('error');
      }
    } catch (err) {
      toast.error('Test failed');
      setConnectionStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ldap/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved');
      } else {
        toast.error(data.message || 'Save failed');
      }
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setSettings(s => ({ ...s, [field]: value }));
  };

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">LDAP / Active Directory</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Authenticate users against Active Directory or LDAP server</p>
        </div>
        {/* Connection Status */}
        {connectionStatus && (
          <div className={`settings-section flex items-center gap-2 px-3 py-1.5 ${
            connectionStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'success' ? 'bg-emerald-500 status-pulse' : 'bg-red-500'}`}></span>
            <span className={`text-xs font-medium ${connectionStatus === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {connectionStatus === 'success' ? 'Connected' : 'Connection Failed'}
            </span>
          </div>
        )}
      </div>

      {/* Enable Toggle Card */}
      <div className="settings-section p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${settings.enabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <svg className={`w-5 h-5 ${settings.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800 dark:text-white">Enable LDAP Authentication</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Allow users to login with their Active Directory credentials</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-sky-500"></div>
          </label>
        </div>
      </div>

      {/* Server Connection */}
      <div className="settings-section p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Server Connection</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">LDAP Server <span className="text-red-500">*</span></label>
            <Input
              value={settings.host}
              onChange={(e) => updateField('host', e.target.value)}
              placeholder="ldap.company.com"
              className="settings-input w-full"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Port <span className="text-red-500">*</span></label>
            <Input
              value={settings.port}
              onChange={(e) => updateField('port', e.target.value)}
              placeholder="389"
              className="settings-input w-full"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Base DN <span className="text-red-500">*</span></label>
            <Input
              value={settings.base_dn}
              onChange={(e) => updateField('base_dn', e.target.value)}
              placeholder="DC=company,DC=com"
              className="settings-input w-full"
            />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <input
            type="checkbox"
            checked={settings.use_ssl}
            onChange={(e) => updateField('use_ssl', e.target.checked)}
            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
          />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Use SSL/TLS (LDAPS)</span>
          <span className="text-[10px] text-gray-400">Port 636</span>
        </label>
      </div>

      {/* Service Account */}
      <div className="settings-section p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Service Account</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Bind DN <span className="text-red-500">*</span></label>
            <Input
              value={settings.service_user}
              onChange={(e) => updateField('service_user', e.target.value)}
              placeholder="CN=svc_vaas,OU=Service,DC=company,DC=com"
              className="settings-input"
            />
            <p className="text-[10px] text-gray-400 mt-1">Full distinguished name used to bind to LDAP</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Bind Password <span className="text-red-500">*</span></label>
            <Input
              type="password"
              value={settings.service_pass}
              onChange={(e) => updateField('service_pass', e.target.value)}
              placeholder="••••••••"
              className="settings-input"
            />
            <p className="text-[10px] text-gray-400 mt-1">Password for the service account</p>
          </div>
        </div>
      </div>

      {/* User Search Settings */}
      <div className="settings-section p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">User Search Settings</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">User Filter</label>
            <Input
              value={settings.user_filter}
              onChange={(e) => updateField('user_filter', e.target.value)}
              placeholder="(sAMAccountName={username})"
              className="settings-input font-mono text-xs"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Use <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-sky-600 dark:text-sky-400">{'{username}'}</code> as placeholder for the login username
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Admin Group <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
            <Input
              value={settings.admin_group}
              onChange={(e) => updateField('admin_group', e.target.value)}
              placeholder="VAAS_Admins"
              className="settings-input"
            />
            <p className="text-[10px] text-gray-400 mt-1">Members of this AD group get administrator privileges</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="settings-info-box p-4 pl-5 bg-sky-50/50 dark:bg-sky-900/10 rounded-lg border border-sky-100 dark:border-sky-800/30">
        <h4 className="font-semibold text-sky-800 dark:text-sky-300 mb-2 text-xs uppercase tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How LDAP Authentication Works
        </h4>
        <ul className="text-xs text-sky-700/80 dark:text-sky-400/80 space-y-1">
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-sky-500 mt-1.5 flex-shrink-0"></span>
            Users authenticate using their Active Directory username and password
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-sky-500 mt-1.5 flex-shrink-0"></span>
            User profiles are automatically synchronized from AD on first login
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-sky-500 mt-1.5 flex-shrink-0"></span>
            Local accounts remain available even when LDAP is enabled
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t dark:border-gray-700">
        <Button variant="secondary" onClick={handleTest} disabled={testing || !settings.host}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

LdapPanel.propTypes = {};
