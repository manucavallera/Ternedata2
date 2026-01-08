"use client";

import { setStatusSessionUser } from "@/store/register";
import {
  setAuthPayload,
  setStatus,
  setUserData,
} from "../store/auth/authSlice";

const sessionSuccessMethod = (dispatch) => {
  // ✅ Verificar que estamos en el navegador
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }

  const tokenString = localStorage.getItem("token");
  const userSelectedRaw = localStorage.getItem("userSelected");
  const userSelected = userSelectedRaw ? JSON.parse(userSelectedRaw) : null;

  console.log("🔐 Token:", tokenString);
  console.log("👤 userSelected RAW:", userSelectedRaw);
  console.log("👤 userSelected PARSED:", userSelected);

  dispatch(setAuthPayload(tokenString));
  dispatch(setStatus("authenticated"));
  dispatch(setStatusSessionUser(true));
  dispatch(setUserData(userSelected));
  return true;
};

export default sessionSuccessMethod;
