export const canAccessAdminPanel = (role) =>
  role === "admin" || role === "super_admin";
