import React, { useState } from "react";

import ListadoMadre from "./components/Listado-Madre";
import ListadoTernero from "./components/Listado-Ternero";
import ListadoEvento from "./components/Listado-Evento";
import ListadoTratamiento from "./components/Listado-Tratamiento";
import ListadoDiarreaTernero from "./components/Listado-Diarrea-Ternero";
import { useSelector } from "react-redux";
import ButtonSelectListado from "./components/Button-Select-Ingreso";
import ResumenSalud from "./components/Resumen-salud"; // ← AGREGAR

const Listadoseccion = () => {
  const { stateSeccion } = useSelector((state) => state.seccion);
  const [step, setStep] = useState(1);

  return (
    <>
      {stateSeccion === true && (
        <div className='p-3 sm:p-6 md:p-8 lg:p-12 bg-gray-100'>
          <ButtonSelectListado setStep={setStep} />
          {/* ⬅️ CORREGIDO: Ahora coinciden con los números del ButtonSelectListado */}
          {step === 1 && <ListadoMadre />}
          {step === 2 && <ListadoTernero />}
          {step === 3 && <ListadoEvento />}
          {step === 4 && <ListadoTratamiento />}
          {step === 6 && <ListadoDiarreaTernero />}
          {step === 7 && <ResumenSalud />} {/* ← AGREGAR */}
        </div>
      )}
    </>
  );
};

export default Listadoseccion;
