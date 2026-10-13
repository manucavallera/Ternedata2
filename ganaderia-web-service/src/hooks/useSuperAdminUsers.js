import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import securityApi from "@/api/security-api";
import logAuthMethod from "@/utils/logAuth";
import sessionLogOutMethod from "@/utils/sessionLogOut";

/** Security API contract for platform-wide super-admin operations. */
export const useSuperAdminUsers = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const request = async (method, url, body) => {
    try {
      const response = await securityApi[method](url, body);
      return { data: response.data, status: response.status };
    } catch (error) {
      if (error.response?.status === 401) {
        sessionLogOutMethod(dispatch);
        logAuthMethod(dispatch, router);
      }
      return {
        data: error.response?.data,
        status: error.response?.status,
        error: true,
      };
    }
  };

  return {
    listGlobalUsers: () => request("get", "/users/admin/global"),
    changeUserRole: (id, rol) => request("put", `/users/${id}/change-role`, { rol }),
    toggleUserStatus: (id) => request("put", `/users/${id}/toggle-status`, {}),
    getUserEstablishments: (id) => request("get", `/users/${id}/establecimientos`),
  };
};

