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


    }
});


// Exportación .
export const {
    //aqui va la carga de data
    setSeccionStatus,
    resetSeccionStatus,


} = seccionSlice.actions;