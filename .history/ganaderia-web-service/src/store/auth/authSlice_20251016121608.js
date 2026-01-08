import { createSlice } from "@reduxjs/toolkit";
import initialState from "./initial";

export const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setAuthPayload: (state, { payload }) => {
      return {
        ...state,
        authPayload: payload,
      };
    },

    resetAuthPayload: (state, { payload }) => {
      return {
        ...state,
        authPayload: null,
      };
    },

    setStatus: (state, { payload }) => {
      return {
        ...state,
        status: payload,
      };
    },

    resetStatus: (state, { payload }) => {
      return {
        ...state,
        status: null,
      };
    },

    setUserData: (state, { payload }) => {
      return {
        ...state,
        userPayload: payload,
      };
    },

    resetUserData: (state, { payload }) => {
      return {
        ...state,
        userPayload: null,
      };
    },

    // 🆕 NUEVO: Cambiar establecimiento (solo Admin)
    setEstablecimientoActual: (state, { payload }) => {
      return {
        ...state,
        establecimientoActual: payload,
      };
    },

    resetEstablecimientoActual: (state) => {
      return {
        ...state,
        establecimientoActual: null,
      };
    },
  },
});

// Exportación
export const {
  setAuthPayload,
  resetAuthPayload,
  setStatus,
  resetStatus,
  setUserData,
  resetUserData,
  setEstablecimientoActual, // 🆕 NUEVO
  resetEstablecimientoActual, // 🆕 NUEVO
} = authSlice.actions;
