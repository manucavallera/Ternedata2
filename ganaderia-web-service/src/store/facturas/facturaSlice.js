import { createSlice } from '@reduxjs/toolkit';
import initialState from './initial';

export const facturaSlice = createSlice({
    name: 'factura',
    initialState,

    reducers: {
        
        setFacturaPayload: (state, { payload }) => {
            return {
                ...state,
                facturaPayload: payload
            }
        },

        resetFacturaPayload: (state, { payload }) => {
            return {
                ...state,
                facturaPayload: null
            }
        },

    }
});


// Exportación .
export const {
    //aqui va la carga de data
    setFacturaPayload,
    resetFacturaPayload,

} = facturaSlice.actions;