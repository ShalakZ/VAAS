import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Input, ConfirmModal } from '../../../components/common';
import { useToast } from '../../../context';
import { ROLE_OPTIONS, ROLE_BADGE_STYLES, MIN_PASSWORD_LENGTH } from '../constants';

/**
 * Users Panel - Manages user accounts and permissions
 * Extracted from SettingsView.jsx for better maintainability
 */
export function UsersPanel() {
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

  const getRoleBadgeStyle = (role) => {
    return ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.viewer;
  };

  const getRoleLabel = (role) => {
    const roleMap = { administrator: 'Admin', security_admin: 'Sec Admin', viewer: 'Viewer' };
    return roleMap[role] || 'Viewer';
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
                    <span className={`settings-badge inline-flex items-center px-2 py-0.5 rounded-md ${getRoleBadgeStyle(user.role)}`}>
                      {getRoleLabel(user.role)}
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
              <p className="text-xs text-gray-400 dark:text-gray-500">Click &quot;Add User&quot; to create your first user account</p>
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

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchUsers(); }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => { setEditingUser(null); fetchUsers(); }}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal
          user={showPasswordModal}
          onClose={() => setShowPasswordModal(null)}
          onSuccess={() => setShowPasswordModal(null)}
        />
      )}

      {showAdImportModal && (
        <AdImportModal
          onClose={() => setShowAdImportModal(false)}
          onSuccess={() => { setShowAdImportModal(false); fetchUsers(); }}
          existingUsers={users}
        />
      )}

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
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
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
              placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
              required
              minLength={MIN_PASSWORD_LENGTH}
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
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
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

AddUserModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

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
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
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

EditUserModal.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    username: PropTypes.string.isRequired,
    display_name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    is_active: PropTypes.bool,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

// ============ Change Password Modal ============
function ChangePasswordModal({ user, onClose, onSuccess }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
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
              placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
              required
              minLength={MIN_PASSWORD_LENGTH}
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
              minLength={MIN_PASSWORD_LENGTH}
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

ChangePasswordModal.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    username: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

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
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
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

AdImportModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  existingUsers: PropTypes.arrayOf(PropTypes.shape({
    username: PropTypes.string.isRequired,
  })).isRequired,
};

export default UsersPanel;
