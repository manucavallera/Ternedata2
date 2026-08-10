export const createSuperAdminUsersClient = ({ api, onUnauthorized }) => {
  const request = async (send) => {
    try {
      const response = await send();
      return { data: response.data, status: response.status };
    } catch (error) {
      if (error.response?.status === 401) onUnauthorized?.();
      return {
        data: error.response?.data,
        status: error.response?.status,
        error: true,
      };
    }
  };

  return {
    listGlobalUsers: () => request(() => api.get("/users/admin/global")),
    changeUserRole: (id, rol) =>
      request(() => api.put(`/users/${id}/change-role`, { rol })),
    toggleUserStatus: (id) =>
      request(() => api.put(`/users/${id}/toggle-status`)),
    getUserEstablishments: (id) =>
      request(() => api.get(`/users/${id}/establecimientos`)),
  };
};
