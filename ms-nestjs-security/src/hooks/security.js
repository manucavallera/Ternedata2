import securityApi from '@/api/security-api';
import logAuthMethod from '@/utils/logAuth';
import sessionLogOutMethod from '@/utils/sessionLogOut';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';

export const useSecurityMicroservicio = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  // ===== SECCIÓN USERS ADMIN =====
  const obtenerUsuariosHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await securityApi.get(`/users`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const obtenerEstadisticasUsuariosHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await securityApi.get(`/users/stats`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const crearUsuarioHook = async (userData) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await securityApi.post(`/users`, userData);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const actualizarUsuarioHook = async (id, userData) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await securityApi.put(`/users/${id}`, userData);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const eliminarUsuarioHook = async (id) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await securityApi.delete(`/users/${id}`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const toggleEstadoUsuarioHook = async (id) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await securityApi.put(`/users/${id}/toggle-status`, {});
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  return {
    obtenerUsuariosHook,
    obtenerEstadisticasUsuariosHook,
    crearUsuarioHook,
    actualizarUsuarioHook,
    eliminarUsuarioHook,
    toggleEstadoUsuarioHook,
  };
};
