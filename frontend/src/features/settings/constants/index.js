/**
 * Settings feature constants
 * Extracted for SonarQube compliance and maintainability
 */

// Password validation
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

// Settings categories for navigation
export const SETTINGS_CATEGORIES = [
  { id: 'users', label: 'Users', icon: 'users', description: 'Manage accounts' },
  { id: 'ldap', label: 'LDAP / AD', icon: 'server', description: 'Directory services' },
  { id: 'database', label: 'Database', icon: 'database', description: 'Data storage' },
  { id: 'knowledgebase', label: 'Knowledge Base', icon: 'kb', description: 'Import & Export' },
  { id: 'logs', label: 'Audit Logs', icon: 'logs', description: 'Activity history' },
];

// Role options for user management
export const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'security_admin', label: 'Security Admin' },
  { value: 'administrator', label: 'Administrator' },
];

// Retention period options for logs/reports
export const RETENTION_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days', default: true },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
];

// Scheduler interval options
export const SCHEDULER_INTERVALS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// Database type options
export const DATABASE_TYPES = [
  { value: 'sqlite', label: 'SQLite (Default)' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mssql', label: 'SQL Server' },
];

// Log level badge styles
export const LOG_LEVEL_STYLES = {
  DEBUG: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CRITICAL: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

// Log category badge styles
export const LOG_CATEGORY_STYLES = {
  audit: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  auth: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  system: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  kb: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  database: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  user: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

// Role badge styles
export const ROLE_BADGE_STYLES = {
  administrator: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-800',
  security_admin: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800',
  viewer: 'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600',
};

// API endpoints for settings
export const API_ENDPOINTS = {
  USERS: '/api/users',
  LDAP_SETTINGS: '/api/ldap/settings',
  LDAP_TEST: '/api/ldap/test',
  LDAP_SEARCH: '/api/ldap/search',
  LDAP_IMPORT: '/api/ldap/import',
  DATABASE_SETTINGS: '/api/database/settings',
  DATABASE_TEST: '/api/database/test',
  DATABASE_MIGRATE: '/api/database/migrate',
  KB_STATS: '/api/kb/stats',
  KB_EXPORT: '/api/kb/export',
  KB_IMPORT: '/api/kb/import',
  DB_STATS: '/api/db/stats',
  DB_CLEANUP: '/api/db/cleanup',
  SCHEDULER_STATUS: '/api/scheduler/status',
  SCHEDULER_SETTINGS: '/api/scheduler/settings',
  SCHEDULER_RUN: '/api/scheduler/run',
  LOGS: '/api/logs',
  LOGS_EXPORT: '/api/logs/export',
  LOGS_CLEANUP: '/api/logs/cleanup',
};
