"use client";

import { setAuthPayload, setStatus, setUserData } from "@/store/auth";

const sessionLogOutMethod = (dispatch) => {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    localStorage.clear();
  }

  dispatch(setAuthPayload({}));
  dispatch(setStatus("no-authenticated"));
  dispatch(setUserData({}));
  return null;
};

export default sessionLogOutMethod;
