"use client";

import React, { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/auth";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useRouterSession } from "@/utils/routerSession";
import { useAuthContext } from "@/context/authContext";
import ClientOnly from "@/components/ClientOnly";
import { useSearchParams } from "next/navigation";

const Registercomponent = () => {
  const dispatch = useDispatch();
  const { registroHooks } = useAuthSession();
  const { sessionRegister, isLoading: routerLoading } = useRouterSession();
  const { isLoading: authLoading } = useAuthContext();
  const { statusSessionUser } = useSelector((state) => state.register);

  const searchParams = useSearchParams();

  // 👇 1. ESTADO "TRAMPA" (Conserva el token aunque la URL se limpie)
  const [tokenCapturado, setTokenCapturado] = useState(null);

  const {
    register,
    handleSubmit,
    setValue, // Usamos setValue para rellenar el input automáticamente
    formState: { errors },
  } = useForm();

  const [userAlert, setuserAlert] = useState({ status: false, message: "" });

  useEffect(() => {
    const tokenUrl = searchParams.get("token");
    const tokenStorage =
      typeof window !== "undefined"
        ? localStorage.getItem("backupToken")
        : null;
    const tokenFinal = tokenUrl || tokenStorage;

    if (tokenFinal) {
      setTokenCapturado(tokenFinal);
      setValue("invitationToken", tokenFinal);
      if (typeof window !== "undefined") {
        localStorage.setItem("backupToken", tokenFinal);
      }
    }

    // Pre-llenar email si viene en la URL (desde la invitación)
    const emailUrl = searchParams.get("email");
    if (emailUrl) {
      setValue("email", emailUrl);
    }
  }, [searchParams, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (data.password === data.confirmPassword) {
      // 👇 3. LÓGICA DE ENVÍO: Usa el manual o el capturado
      const tokenParaEnviar = data.invitationToken || tokenCapturado;

      const newUser = {
        name: data.username,
        email: data.email,
        password: data.password,
        invitationToken: tokenParaEnviar, // 👈 Aquí va el token seguro
      };

      console.log("Enviando registro con datos:", newUser);

      const res = await registroHooks(newUser);

      if (typeof res === "number") {
        const msg =
          res === 0
            ? "ERROR DE CONEXIÓN. Verificá que el servidor esté corriendo."
            : "ERROR, USUARIO REGISTRADO O DATOS INCORRECTOS";
        const dataAlert = {
          status: true,
          message: msg,
        };
        setuserAlert(dataAlert);
      } else {
        const mensajeExito = tokenParaEnviar
          ? "✅ ¡REGISTRO Y ACTIVACIÓN EXITOSA! Redirigiendo..."
          : "✅ REGISTRO EXITOSO. Redirigiendo al login...";

        const dataAlert = {
          status: true,
          message: mensajeExito,
        };
        setuserAlert(dataAlert);

        setTimeout(() => {
          // Si había token de invitación, lo pasamos al login en la URL
          // para que se procese automáticamente después del login
          if (tokenParaEnviar) {
            window.location.href = `/auth/login?token=${tokenParaEnviar}`;
          } else {
            window.location.href = "/auth/login";
          }
        }, 3000);
      }
    } else {
      const dataAlert = {
        status: true,
        message: "LAS CONTRASEÑAS NO COINCIDEN",
      };
      setuserAlert(dataAlert);
    }
  });

  useEffect(() => {
    if (!authLoading && !routerLoading) {
      sessionRegister();
    }
  }, [authLoading, routerLoading]);

  return (
    <ClientOnly
      fallback={
        <div className='flex items-center justify-center min-h-screen bg-gray-100'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>Verificando sesión...</p>
          </div>
        </div>
      }
    >
      {statusSessionUser === false && (
        <div className='h-[calc(100vh-7rem)] flex justify-center items-center'>
          <form
            onSubmit={onSubmit}
            className='w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3 bg-white shadow-md rounded px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8 mb-4 mx-3 sm:mx-0'
          >
            <h1 className='font-bold text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4 text-gray-700'>
              Registro
            </h1>

            {/* USERNAME */}
            <label
              htmlFor='username'
              className='block text-gray-700 text-xs sm:text-sm font-bold mb-1 sm:mb-2'
            >
              Username
            </label>
            <input
              type='text'
              placeholder='name'
              {...register("username", {
                required: { value: true, message: "Username es requerido" },
                pattern: /^[a-zA-Z0-9]+$/i,
                maxLength: 20,
                minLength: 2,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-2 sm:px-3 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.username && (
              <p className='text-red-500 text-xs'>{errors.username.message}</p>
            )}

            {/* EMAIL */}
            <label
              htmlFor='email'
              className='block text-gray-700 text-xs sm:text-sm font-bold mb-1 sm:mb-2'
            >
              Email
            </label>
            <input
              type='email'
              placeholder='email@gmail.com'
              {...register("email", {
                required: { value: true, message: "Email es requerido" },
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                maxLength: 50,
                minLength: 5,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-2 sm:px-3 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.email && (
              <p className='text-red-500 text-xs'>{errors.email.message}</p>
            )}

            {/* PASSWORD */}
            <label
              htmlFor='password'
              className='block text-gray-700 text-xs sm:text-sm font-bold mb-1 sm:mb-2'
            >
              Password
            </label>
            <input
              type='password'
              placeholder='password'
              {...register("password", {
                required: { value: true, message: "Password es requerido" },
                maxLength: 20,
                minLength: 8,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-2 sm:px-3 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.password && (
              <p className='text-red-500 text-xs'>{errors.password.message}</p>
            )}

            {/* CONFIRM PASSWORD */}
            <label
              htmlFor='confirmPassword'
              className='block text-gray-700 text-xs sm:text-sm font-bold mb-1 sm:mb-2'
            >
              Confirm Password
            </label>
            <input
              type='password'
              placeholder='repeat password'
              {...register("confirmPassword", {
                required: { value: true, message: "Password es requerido" },
                maxLength: 20,
                minLength: 8,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-2 sm:px-3 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.confirmPassword && (
              <p className='text-red-500 text-xs'>
                {errors.confirmPassword.message}
              </p>
            )}

            {/* 👇 CAJA DE TOKEN (Aparecerá rellena automáticamente) */}
            <label
              htmlFor='invitationToken'
              className='block text-gray-700 text-xs sm:text-sm font-bold mb-1 sm:mb-2 mt-4'
            >
              Token de Invitación (Opcional)
            </label>
            <input
              type='text'
              placeholder='Pega tu código aquí...'
              {...register("invitationToken")}
              className='shadow appearance-none border rounded w-full py-2 px-2 sm:px-3 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline mb-4 bg-yellow-50'
            />

            <button
              className='w-full py-2 sm:py-3 bg-indigo-600 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              type='submit'
            >
              Register
            </button>

            {userAlert?.status && (
              <p
                className={`${
                  userAlert.message.includes("ERROR") ||
                  userAlert.message.includes("CONTRASEÑAS")
                    ? "bg-red-500"
                    : "bg-green-500"
                } text-white text-center text-xs sm:text-sm font-semibold p-2 rounded-md shadow-md mt-2`}
              >
                {userAlert?.message}
              </p>
            )}
          </form>
        </div>
      )}
    </ClientOnly>
  );
};

export default Registercomponent;
