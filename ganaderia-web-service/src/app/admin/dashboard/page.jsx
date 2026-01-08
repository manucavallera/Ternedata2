"use client";

import FormularioPrincipal from '@/components/secciones/ingreso/Formulario-Principal';
import Listadoseccion from '@/components/secciones/listado/Listado-seccion';
import React from 'react';
import { useSelector } from 'react-redux';


const Dashboard = () => {
    

    const { authPayload, status } = useSelector(state => state.auth);
    
    const { stateSeccion } = useSelector((state) => state.seccion);
    
    const {statusSessionUser} = useSelector(state => state.register);
    
    if (status !== "authenticated" && !authPayload?.user && statusSessionUser ===true) {
        return (
            <div className="flex items-center justify-center h-screen">
                <h1 className="text-4xl font-bold text-red-50">404 | Not Found</h1>
            </div>
        );
    }


    return (
            <>
            {stateSeccion ===false?
            (<FormularioPrincipal/>)
            :
            (<Listadoseccion/>)
            }
            </>
    );
};

export default Dashboard;
