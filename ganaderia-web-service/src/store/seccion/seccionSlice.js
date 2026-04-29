import { createSlice } from '@reduxjs/toolkit';
import initialState from './initial';

export const seccionSlice = createSlice({
    name: 'seccion',
    initialState,

    reducers: {

        setSeccionStatus: (state, { payload }) => {
            return {
                ...state,
                stateSeccion: payload
            }
        },

        resetSeccionStatus: (state, { payload }) => {
            return {
                ...state,
                stateSeccion: null
            }
        },

        setVistaApp: (state, { payload }) => {
            return {
                ...state,
                vistaApp: payload
            }
        },


    }
});


// Exportación .
export const {
    //aqui va la carga de data
    setSeccionStatus,
    resetSeccionStatus,
    setVistaApp,


} = seccionSlice.actions;