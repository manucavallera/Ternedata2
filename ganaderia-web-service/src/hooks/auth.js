import { useDispatch } from 'react-redux';
import securityApi from '@/api/security-api';
import { setAuthPayload, setStatus, setUserData } from '@/store/auth';

export const useAuthSession = () => {
    
    const dispatch = useDispatch(); 

    const registroHooks = async (objectUsuario) => {
      
        try {
            const { data, config, headers, status, statusText, request } = await securityApi.post(`/auth/register`, objectUsuario);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            return error?.response?.status ?? 0;
        }
    };

    const loginHooks = async (objectUsuario) => {
        try {

            const { data, config, headers, status, statusText, request } = await securityApi.post(`/auth/login`, objectUsuario);
           
            // ✅ Verificar que estamos en el navegador antes de usar localStorage
            if (data && typeof window !== "undefined") {
                localStorage.clear();
                localStorage.setItem('token',data?.token);
                localStorage.setItem('userSelected',JSON.stringify(data?.user));
            }

            dispatch(setAuthPayload(data));
            dispatch(setStatus("authenticated"));
            dispatch(setUserData(data?.user));
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            // ✅ Verificar que estamos en el navegador antes de usar localStorage
            if (typeof window !== "undefined") {
                localStorage.clear();
            }
            dispatch(setAuthPayload({}));
            dispatch(setStatus("not-authenticated"));

            return error.response.status;
        }
    };

    const getProfileHook = async () => {
        try {
            const { data } = await securityApi.get(`/users/profile/me`);
            return { success: true, data };
        } catch (error) {
            return { success: false, status: error.response?.status };
        }
    };

    const updateProfileHook = async (userId, updateData) => {
        try {
            const { data } = await securityApi.put(`/users/${userId}`, updateData);
            // Actualizar el store con los nuevos datos
            dispatch(setUserData(data));
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Error al actualizar' };
        }
    };

    const forgotPasswordHook = async (email) => {
        try {
            const { data } = await securityApi.post(`/auth/forgot-password`, { email });
            return { success: true, data };
        } catch (error) {
            return { success: false, status: error.response?.status };
        }
    };

    const resetPasswordHook = async (token, newPassword) => {
        try {
            const { data } = await securityApi.post(`/auth/reset-password`, { token, newPassword });
            return { success: true, data };
        } catch (error) {
            return { success: false, status: error.response?.status, message: error.response?.data?.message };
        }
    };

    return { loginHooks, registroHooks, forgotPasswordHook, resetPasswordHook, getProfileHook, updateProfileHook };
};
