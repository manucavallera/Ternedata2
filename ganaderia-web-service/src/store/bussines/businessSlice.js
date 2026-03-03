import { createSlice } from "@reduxjs/toolkit";

export const businessSlice = createSlice({
  name: "business",
  initialState: {
    // Aquí guardaremos el objeto del establecimiento seleccionado { id_establecimiento, nombre, ... }
    establecimientoActual: null,
  },
  reducers: {
    setEstablecimientoActual: (state, action) => {
      state.establecimientoActual = action.payload;
    },
    clearEstablecimientoActual: (state) => {
      state.establecimientoActual = null;
    },
  },
});

// Exportamos las acciones para usarlas en el Selector
export const { setEstablecimientoActual, clearEstablecimientoActual } =
  businessSlice.actions;
