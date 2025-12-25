import { useState, useEffect } from 'react';
import { Button, Input, Select, ConfirmModal } from '../../components/common';
import { useToast } from '../../context';

const settingsCategories = [
  { id: 'users', label: 'Users', icon: 'users', description: 'Manage accounts' },
  { id: 'ldap', label: 'LDAP / AD', icon: 'server', description: 'Directory services' },
  { id: 'database', label: 'Database', icon: 'database', description: 'Data storage' },
  { id: 'knowledgebase', label: 'Knowledge Base', icon: 'kb', description: 'Import & Export' },
  { id: 'logs', label: 'Audit Logs', icon: 'logs', description: 'Activity history' },
];

const icons = {
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  server: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  kb: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  logs: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

// Action icons for buttons (small, inline)
const ActionIcon = ({ type, className = "w-4 h-4" }) => {
  const iconPaths = {
    download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
    upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    bolt: "M13 10V3L4 14h7v7l9-11h-7z",
    broom: "M15 3l-1 1m0 0l-2 2m2-2l2 2m-2-2L9 9m6-3l3 3m-9 9l-3-3m3 3l3-3m-3 3v-3m0 0H9m3 0l3-3",
    play: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    csv: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths[type]} />
    </svg>
  );
};

export function SettingsView() {
  const [activePanel, setActivePanel] = useState('users');

  return (
    <div className="flex bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80 max-w-6xl w-full mx-auto h-[calc(100vh-200px)] min-h-[500px] max-h-[750px]">
      {/* Sidebar */}
      <div className="w-56 bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-900 dark:to-slate-800/80 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white tracking-tight">Settings</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">System Configuration</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {settingsCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActivePanel(cat.id)}
              className={`settings-nav-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left cursor-pointer ${
                activePanel === cat.id
                  ? 'active bg-white dark:bg-slate-700/60 shadow-sm border border-gray-200/60 dark:border-gray-600/40'
                  : 'hover:bg-white/60 dark:hover:bg-slate-700/30'
              }`}
            >
              <span className={`flex-shrink-0 transition-colors ${
                activePanel === cat.id
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {icons[cat.icon]}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`font-medium block text-[13px] tracking-tight ${
                  activePanel === cat.id
                    ? 'text-gray-800 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}>{cat.label}</span>
                <span className={`text-[10px] font-medium ${
                  activePanel === cat.id
                    ? 'text-sky-600/80 dark:text-sky-400/80'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {cat.description}
                </span>
              </div>
              <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-all ${
                activePanel === cat.id
                  ? 'text-sky-500 dark:text-sky-400 translate-x-0.5'
                  : 'text-gray-300 dark:text-gray-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200/80 dark:border-gray-700/60 bg-gradient-to-t from-slate-100 to-transparent dark:from-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-gray-400 dark:text-gray-500">
              <span className="font-semibold text-gray-500 dark:text-gray-400">VAAS</span>
              <span className="ml-1">v1.0</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-pulse"></span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Panel */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800 dark:to-gray-800">
        <div key={activePanel} className="settings-panel-content h-full">
          {activePanel === 'users' && <UsersPanel />}
          {activePanel === 'ldap' && <LdapPanel />}
          {activePanel === 'database' && <DatabasePanel />}
          {activePanel === 'knowledgebase' && <KnowledgeBaseSettingsPanel />}
          {activePanel === 'logs' && <LogsPanel />}
        </div>
      </div>
    </div>
  );
}

// ============ Users Panel ============
function UsersPanel() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [showAdImportModal, setShowAdImportModal] = useState(false);
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, userId: null, username: '' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
    checkLdapStatus();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const checkLdapStatus = async () => {
    try {
      const res = await fetch('/api/ldap/settings');
      const data = await res.json();
      // Backend returns settings directly (not wrapped in {success, settings})
      if (data) {
        const isEnabled = data.LDAP_ENABLED === true ||
                         data.enabled === true ||
                         data.LDAP_ENABLED === 'true' ||
                         data.enabled === 'true';
        setLdapEnabled(isEnabled);
      }
    } catch (err) {
      console.error('LDAP check failed:', err);
    }
  };

  const handleDeleteUser = (userId, username) => {
    setConfirmModal({ show: true, userId, username });
  };

  const confirmDeleteUser = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${confirmModal.userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('User deleted');
        fetchUsers();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Failed to delete user');
    } finally {
      setDeleting(false);
      setConfirmModal({ show: false, userId: null, username: '' });
    }
  };

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
            User Management
            <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full">{users.length} users</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Create, edit, and manage user accounts and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowAdImportModal(true)}
            disabled={!ldapEnabled}
            title={ldapEnabled ? 'Import users from Active Directory' : 'Enable LDAP in settings first'}
            className="btn-lift text-xs"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import AD
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)} className="btn-lift text-xs">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      ) : (
        <div className="settings-section overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Username</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Display Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Last Login</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {users.map((user) => (
                <tr key={user.id} className="settings-table-row">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{user.username}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.display_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`settings-badge inline-flex items-center px-2 py-0.5 rounded-md ${
                      user.role === 'administrator' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-800' :
                      user.role === 'security_admin' ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800' :
                      'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600'
                    }`}>
                      {user.role === 'administrator' ? 'Admin' : user.role === 'security_admin' ? 'Sec Admin' : 'Viewer'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`settings-badge inline-flex items-center px-2 py-0.5 rounded-md ${
                      user.auth_type === 'ldap' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800' :
                      'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800'
                    }`}>
                      {user.auth_type === 'ldap' ? 'LDAP' : 'Local'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500 status-pulse' : 'bg-red-500'}`}></span>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-0.5">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 p-1.5 rounded-md hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors cursor-pointer"
                        title="Edit user"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {user.auth_type !== 'ldap' && (
                        <button
                          onClick={() => setShowPasswordModal(user)}
                          className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
                          title="Change password"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                        title="Delete user"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">No users found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Click "Add User" to create your first user account</p>
            </div>
          )}
        </div>
      )}

      {/* Role Legend */}
      <div className="mt-4 settings-info-box p-3 pl-4 bg-sky-50/50 dark:bg-sky-900/10 rounded-lg border border-sky-100 dark:border-sky-800/30">
        <h4 className="font-semibold text-sky-800 dark:text-sky-300 mb-1.5 text-xs uppercase tracking-wide">Role Permissions</h4>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span className="font-medium text-gray-600 dark:text-gray-300">Viewer</span>
            <span className="text-gray-400 dark:text-gray-500">Upload, view, export</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span className="font-medium text-gray-600 dark:text-gray-300">Security Admin</span>
            <span className="text-gray-400 dark:text-gray-500">+ assignments, KB rules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span className="font-medium text-gray-600 dark:text-gray-300">Administrator</span>
            <span className="text-gray-400 dark:text-gray-500">Full system access</span>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          user={showPasswordModal}
          onClose={() => setShowPasswordModal(null)}
          onSuccess={() => {
            setShowPasswordModal(null);
          }}
        />
      )}

      {/* Import from AD Modal */}
      {showAdImportModal && (
        <AdImportModal
          onClose={() => setShowAdImportModal(false)}
          onSuccess={() => {
            setShowAdImportModal(false);
            fetchUsers();
          }}
          existingUsers={users}
        />
      )}

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal({ show: false, userId: null, username: '' })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user "${confirmModal.username}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

// ============ Add User Modal ============
function AddUserModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    display_name: '',
    email: '',
    role: 'viewer',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Username and password are required');
      return;
    }
    if (form.password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User created successfully');
        onSuccess();
      } else {
        toast.error(data.message || 'Failed to create user');
      }
    } catch (err) {
      toast.error('Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200/50 dark:border-gray-700/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-white">Add New User</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Create a local user account</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Username <span className="text-red-500">*</span></label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Enter username"
              required
              className="settings-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Password <span className="text-red-500">*</span></label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 4 characters"
              required
              minLength={4}
              className="settings-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Display Name</label>
            <Input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="viewer">Viewer</option>
              <option value="security_admin">Security Admin</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-5 mt-2 border-t border-gray-100 dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose} className="btn-lift">Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving} className="btn-lift">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating...
                </span>
              ) : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ Edit User Modal ============
function EditUserModal({ user, onClose, onSuccess }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: user.display_name || '',
    email: user.email || '',
    role: user.role || 'viewer',
    is_active: user.is_active !== false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User updated successfully');
        onSuccess();
      } else {
        toast.error(data.message || 'Failed to update user');
      }
    } catch (err) {
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Edit User</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <Input value={user.username} disabled className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed" />
            <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
            <Input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="viewer">Viewer</option>
              <option value="security_admin">Security Admin</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Account {form.is_active ? 'Active' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ Change Password Modal ============
function ChangePasswordModal({ user, onClose, onSuccess }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Password changed successfully');
        onSuccess();
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (err) {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Change Password</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Changing password for user: <strong>{user.username}</strong>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password *</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 4 characters"
              required
              minLength={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password *</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              minLength={4}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving || password !== confirmPassword}>
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ Import from AD Modal ============
function AdImportModal({ onClose, onSuccess, existingUsers }) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [importRole, setImportRole] = useState('viewer');
  const [importing, setImporting] = useState(false);

  const existingUsernames = existingUsers.map(u => u.username.toLowerCase());

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setSearching(true);
    setResults([]);
    setSelectedUser(null);
    try {
      const res = await fetch(`/api/ldap/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.users || []);
        if (data.users?.length === 0) {
          toast.info('No users found');
        }
      } else {
        toast.error(data.message || 'Search failed');
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async () => {
    if (!selectedUser) return;

    setImporting(true);
    try {
      const res = await fetch('/api/ldap/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUser.username,
          role: importRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`User "${selectedUser.username}" imported successfully`);
        onSuccess();
      } else {
        toast.error(data.message || 'Import failed');
      }
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Import from Active Directory</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto space-y-4">
          {/* Search Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search AD Users</label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter username or name (min 2 chars)"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full"
                />
              </div>
              <Button variant="primary" onClick={handleSearch} disabled={searching || searchQuery.length < 2} className="flex-shrink-0">
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Results Section */}
          {results.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Results ({results.length})
              </label>
              <div className="border dark:border-gray-700 rounded-lg max-h-48 overflow-auto">
                {results.map((adUser, idx) => {
                  const alreadyExists = existingUsernames.includes(adUser.username?.toLowerCase());
                  return (
                    <div
                      key={idx}
                      onClick={() => !alreadyExists && setSelectedUser(adUser)}
                      className={`p-3 border-b dark:border-gray-700 last:border-b-0 flex justify-between items-center ${
                        alreadyExists
                          ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed'
                          : selectedUser?.username === adUser.username
                            ? 'bg-blue-50 dark:bg-blue-900/30 cursor-pointer'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{adUser.username}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {adUser.display_name} {adUser.email && `- ${adUser.email}`}
                        </div>
                      </div>
                      {alreadyExists && (
                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs">
                          Already imported
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Import Section */}
          {selectedUser && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-3">Import User</h4>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Username:</span>{' '}
                  <strong className="text-gray-800 dark:text-gray-200">{selectedUser.username}</strong>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>{' '}
                  <strong className="text-gray-800 dark:text-gray-200">{selectedUser.display_name || 'N/A'}</strong>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Role</label>
                  <select
                    value={importRole}
                    onChange={(e) => setImportRole(e.target.value)}
                    className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="security_admin">Security Admin</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>
                <Button variant="primary" onClick={handleImport} disabled={importing} className="w-full">
                  {importing ? 'Importing...' : 'Import User'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
}

// ============ LDAP Panel ============
function LdapPanel() {
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
      // Backend returns settings directly (not wrapped in {success, settings})
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

// ============ Database Panel ============
function DatabasePanel() {
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

  const defaultPorts = {
    mysql: '3306',
    postgresql: '5432',
    mssql: '1433',
    azuresql: '1433',
  };

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
        newSettings.port = defaultPorts[value] || '';
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
                  placeholder={defaultPorts[settings.db_type] || 'Auto'}
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

// ============ Knowledge Base Settings Panel ============
function KnowledgeBaseSettingsPanel() {
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
    action: null, // 'import', 'kbCleanup', 'deleteOld', 'removeDuplicates', 'fullMaintenance', 'runScheduler'
    title: '',
    message: '',
    variant: 'warning',
    pendingFile: null, // for import action
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
        // Handle case where success might not be set but stats are present
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
      // Keep default values - already initialized to 0
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

    // Show warning modal based on import mode
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

  // Combined full maintenance: delete old reports + remove duplicates + optimize DB
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
      // Step 1: Delete old reports
      try {
        const res = await fetch('/api/db/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delete_before_days: retentionDays }),
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

      // Step 2: Remove duplicates
      try {
        const res = await fetch('/api/db/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remove_duplicates: true }),
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

      // Step 3: Optimize DB
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

  // Confirm modal action handler
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

// ============ Logs Panel ============
function LogsPanel() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('viewer'); // viewer, filters, maintenance
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

  // Auto-refresh state - disabled by default for better UX
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

  // Available options
  const categories = ['all', 'audit', 'security', 'auth', 'application', 'database', 'system', 'kb', 'upload', 'export', 'user', 'settings'];
  const levels = ['all', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
  const perPageOptions = [50, 100, 200, 500];

  // Demo logs for when API is not available
  const demoLogs = [
    { id: 1, timestamp: new Date().toISOString(), username: 'admin', action: 'Login', details: 'User logged in successfully', type: 'auth', level: 'INFO', category: 'security' },
    { id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), username: 'admin', action: 'KB Rule Added', details: 'Added hostname rule: db-server-01 → Database Team', type: 'kb', level: 'INFO', category: 'audit' },
    { id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), username: 'secadmin', action: 'File Upload', details: 'Uploaded vulnerability_report_Q4.xlsx (1,234 rows)', type: 'upload', level: 'INFO', category: 'application' },
    { id: 4, timestamp: new Date(Date.now() - 10800000).toISOString(), username: 'admin', action: 'Export', details: 'Exported master report (1,234 rows)', type: 'export', level: 'INFO', category: 'application' },
    { id: 5, timestamp: new Date(Date.now() - 14400000).toISOString(), username: 'viewer', action: 'Login', details: 'User logged in successfully', type: 'auth', level: 'INFO', category: 'security' },
    { id: 6, timestamp: new Date(Date.now() - 18000000).toISOString(), username: 'admin', action: 'User Created', details: 'Created user: secadmin (Security Admin)', type: 'user', level: 'INFO', category: 'audit' },
    { id: 7, timestamp: new Date(Date.now() - 86400000).toISOString(), username: 'secadmin', action: 'KB Rule Edited', details: 'Modified title rule: SQL Injection → System Admin', type: 'kb', level: 'INFO', category: 'audit' },
    { id: 8, timestamp: new Date(Date.now() - 172800000).toISOString(), username: 'admin', action: 'Settings Changed', details: 'Updated LDAP configuration', type: 'settings', level: 'WARNING', category: 'system' },
  ];

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

  // Live filter updates - apply filters as they change (debounced via appliedFilters sync)
  useEffect(() => {
    if (initialLoadDone) {
      // Sync filters to appliedFilters for live updates
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

  // Auto-refresh effect - only when explicitly enabled
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
        // Backend returns stats under 'statistics' key
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
      // Use demo stats
      setStats({
        total_logs: demoLogs.length,
        last_24h: demoLogs.filter(l => new Date(l.timestamp) > new Date(Date.now() - 86400000)).length,
        db_size_mb: 0.5,
        active_filters: countActiveFilters(),
      });
    }
  };

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
        setLogs(demoLogs);
        setPagination(prev => ({
          ...prev,
          total: demoLogs.length,
          totalPages: 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load logs, using demo data');
      setLogs(demoLogs);
      setPagination(prev => ({ ...prev, total: demoLogs.length, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setPagination(prev => ({ ...prev, page: 1 }));
    setStats(prev => ({ ...prev, active_filters: countActiveFilters() }));
  };

  const clearFilters = () => {
    const defaultFilters = { category: 'all', level: 'all', username: '', search: '', startDate: '', endDate: '' };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExportCSV = async () => {
    try {
      // Backend expects filters in JSON body, not URL params
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
      // Categories
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
      // Legacy action names
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

  // Quick filter buttons for Log Viewer
  const quickFilters = ['all', 'audit', 'security', 'auth', 'application', 'database', 'system'];

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
            {quickFilters.map(qf => (
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
              <div className="text-6xl mb-4">📋</div>
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
                    {perPageOptions.map(opt => (
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
                {categories.map(cat => (
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
                {levels.map(lvl => (
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
