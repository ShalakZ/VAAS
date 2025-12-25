// Teams list - this will be populated from the backend
// For now, export a default that can be overridden
export const DEFAULT_TEAMS = [
  'Unclassified',
  'Application',
  'System Admin',
  'Out of Linux Scope',
  'Out of Platform Scope'
];

// System teams that have special handling (cannot be saved to KB, etc.)
// Extracted to avoid duplication across components
export const SYSTEM_TEAMS = ['system admin', 'out of linux scope', 'out of platform scope'];

// Check if a team is a system team (case-insensitive)
export const isSystemTeam = (team) => {
  if (!team) return false;
  return SYSTEM_TEAMS.includes(team.toLowerCase());
};

// This will be set from the backend via globalThis.__VAAS_CONFIG__
export const getTeamsList = () => {
  return globalThis.__VAAS_CONFIG__?.teamsList || DEFAULT_TEAMS;
};
