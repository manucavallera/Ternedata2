"use client";

import { setStatusSessionUser } from "@/store/register";
import {
  setAuthPayload,
  setStatus,
  setUserData,
} from "../store/auth/authSlice";

const sessionSuccessMethod = (dispatch) => {
  const tokenString = localStorage.getItem("token");
  const userSelected = JSON.parse(localStorage.getItem("userSelected"));

  // ✅ AGREGAR ESTOS LOGS:
  console.log("🔐 Token:", tokenString);
  console.log("👤 userSelected RAW:", localStorage.getItem("userSelected"));
  console.log("👤 userSelected PARSED:", userSelected);

  dispatch(setAuthPayload(tokenString));
  dispatch(setStatus("authenticated"));
  dispatch(setStatusSessionUser(true));
  dispatch(setUserData(userSelected));
  return true;
};

export default sessionSuccessMethod;
