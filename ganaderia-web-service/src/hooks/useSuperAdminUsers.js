import { useMemo } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

import securityApi from "@/api/security-api";
import { setAuthPayload, setUserData } from "@/store/auth/authSlice";
import logAuthMethod from "@/utils/logAuth";
import sessionLogOutMethod from "@/utils/sessionLogOut";
import { createSuperAdminUsersClient } from "./superAdminUsersClient.mjs";
import { saveRefreshedSession } from "./saveRefreshedSession.mjs";

/** Security API contract for platform-wide super-admin operations. */
export const useSuperAdminUsers = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  return useMemo(
    () =>
      createSuperAdminUsersClient({
        api: securityApi,
        onUnauthorized: () => {
          sessionLogOutMethod(dispatch);
          logAuthMethod(dispatch, router);
        },
        onSessionRefreshed: (session) => {
          if (typeof window === "undefined") return;
          const userPayload = saveRefreshedSession(
            session,
            window.localStorage,
          );
          dispatch(setAuthPayload(session.token));
          dispatch(setUserData(userPayload));
        },
      }),
    [dispatch, router],
  );
};
