import React, { useState } from "react";

import FormularioMadre from "./components/Formulario-Madre";
import FormularioTernero from "./components/Formulario-Ternero";
import FormularioEvento from "./components/Formulario-Evento";
import FormularioTratamiento from "./components/Formulario-Tratamiento";
import FormularioDiarreaTernero from "./components/Formulario-Diarrea-Ternero";
import ButtonSelect from "./components/Button-Select-Ingreso";
// ⬅️ ELIMINADO: import FormularioPadre from "./components/Formulario-Padre";

const FormularioPrincipal = () => {
  const [step, setStep] = useState(1);

  return (
    <>
      {step && <ButtonSelect setStep={setStep} />}
      {/* ✅ Steps actualizados después de eliminar Tratamiento Ternero */}
      {step === 1 && <FormularioMadre setStep={setStep} />}
      {step === 2 && <FormularioTernero setStep={setStep} />}
      {step === 3 && <FormularioEvento setStep={setStep} />}
      {step === 4 && <FormularioTratamiento setStep={setStep} />}
      {step === 5 && <FormularioDiarreaTernero setStep={setStep} />}
    </>
  );
};

export default FormularioPrincipal;
