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
            return error.response.status;
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

    return { loginHooks, registroHooks };
};
