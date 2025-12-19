// User permissions - populated from backend
export const getPermissions = () => {
  return window.__VAAS_CONFIG__?.permissions || {
    canModify: true,
    canModifyKb: true,
    canExport: true,
    canManageUsers: true,
    role: 'administrator'
  };
};
