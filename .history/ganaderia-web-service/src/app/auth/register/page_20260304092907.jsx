"use client";

import React from "react";
import React, { Suspense } from "react"; // 👈 Agregamos Suspense
import Registercomponent from "@/components/Register-component";

const Register = () => {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center min-h-screen'>
          Cargando...
        </div>
      }
    >
      <Registercomponent />
    </Suspense>
  );
};

export default Register;
