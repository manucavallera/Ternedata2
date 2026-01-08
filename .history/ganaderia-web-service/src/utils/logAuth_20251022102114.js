"use client";

import { setAuthPayload, setStatus, setUserData } from "@/store/auth";
import { setStatusSessionUser } from "@/store/register";

const logAuthMethod = (dispatch, router) => {
  // ✅ Verificar que estamos en el navegador
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("userSelected");
  }

  dispatch(setAuthPayload({}));
  dispatch(setStatus("not-authenticated"));
  dispatch(setStatusSessionUser(false));
  dispatch(setUserData({}));
  router.push("/admin/logout");
};

export default logAuthMethod;
