"use client";

import React from "react";
import React, { Suspense } from "react"; // 👈 Agregamos Suspense
import Registercomponent from "@/components/Register-component";

const Register = () => {
  return (
    <>
      <Registercomponent />
    </>
  );
};

export default Register;
