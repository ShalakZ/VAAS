// Teams list - this will be populated from the backend
// For now, export a default that can be overridden
export const DEFAULT_TEAMS = [
  'Unclassified',
  'Application',
  'System Admin',
  'Out of Linux Scope',
  'Out of Platform Scope'
];

// This will be set from the backend via window.__VAAS_CONFIG__
export const getTeamsList = () => {
  return window.__VAAS_CONFIG__?.teamsList || DEFAULT_TEAMS;
};
