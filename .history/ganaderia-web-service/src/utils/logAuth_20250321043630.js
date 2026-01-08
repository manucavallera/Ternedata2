"use client";

import { setAuthPayload,setStatus,setUserData } from "@/store/auth";
import { setStatusSessionUser } from "@/store/register";

const logAuthMethod = (dispatch, router) => {
      
      localStorage.removeItem("token");
      localStorage.removeItem("userSelected");
      dispatch(setAuthPayload({}));
      dispatch(setStatus("not-authenticated"));
      // Redirige al usuario a la página de inicio de sesión
      dispatch(setStatusSessionUser(false));
      dispatch(setUserData({}));
      router.push("/admin/logout");
};

export default logAuthMethod;

