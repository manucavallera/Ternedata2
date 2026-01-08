import { createSlice } from '@reduxjs/toolkit';
import initialState from './initial';

export const registerSlice = createSlice({
    name: 'register',
    initialState,

    reducers: {

        setStatusRegister: (state, { payload }) => {
            return {
                ...state,
                statusRegister: payload
            }
        },

        resetStatusRegister: (state, { payload }) => {
            return {
                ...state,
                statusRegister: null
            }
        },

        setStatusSessionUser: (state, { payload }) => {
            return {
                ...state,
                statusSessionUser: payload
            }
        },

        resetStatusSessionUser: (state, { payload }) => {
            return {
                ...state,
                statusSessionUser: null
            }
        },

    }
});


// Exportación .
export const {
    //aqui va la carga de data
    setStatusRegister,
    resetStatusRegister,

    setStatusSessionUser,
    resetStatusSessionUser
} = registerSlice.actions;