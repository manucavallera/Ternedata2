import { configureStore, combineReducers } from '@reduxjs/toolkit'

// *-- Slices...
import { authSlice } from './auth'
import { facturaSlice } from './facturas'
import { registerSlice } from './register'
import { seccionSlice } from './seccion'


// @dev-note: Aquí se unifican todos los reducers para facilitar su uso en la configuracion del store.
const rootReducers = combineReducers({
    //auth: autenticacion peyload para guardar datos del login user
    auth: authSlice.reducer,

    //factura: payload para guardar datos de la factura
    factura:facturaSlice.reducer,

    //register: payload para guardar datos de registro user o estado en el que esta ese registro
    register:registerSlice.reducer,

    //seccion: payload que se encarga de manejar cada secicon de ingreso y tablas
    seccion:seccionSlice.reducer,
});

const appReducer = (state, action) => {
    if (action.type === 'RESET') {
        state = undefined;
    }

    return rootReducers(state, action);
}


const store = configureStore({
    reducer: appReducer,
})


export {
    store
}