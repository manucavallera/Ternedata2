"use client";

import { useAuthSession } from "@/hooks/auth";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useRouterSession } from "@/utils/routerSession";
import { setStatusRegister, setStatusSessionUser } from "@/store/register";
import { useAuthContext } from "@/context/authContext";
import ClientOnly from "@/components/ClientOnly";

const Login = () => {
  const dispatch = useDispatch();

  const { loginHooks } = useAuthSession();
  const { sessionLogin, isLoading: routerLoading } = useRouterSession();
  const { login, isLoading: authLoading } = useAuthContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [userAlert, setUserAlert] = useState({ status: false, message: "" });

  const { statusRegister, statusSessionUser } = useSelector(
    (state) => state.register
  );

  const onSubmit = handleSubmit(async (data) => {
    const userCredentials = {
      email: data.email,
      password: data.password,
    };

    const res = await loginHooks(userCredentials);

    // ✅ DEBUG: Ver qué devuelve el backend
    console.log("📦 Respuesta del login:", res?.data);

    if (res === 401) {
      setUserAlert({
        status: true,
        message: "ERROR: Credenciales incorrectas",
      });
    } else {
      // ✅ 1. Guardar token
      localStorage.setItem("token", res?.data?.token);

      // ✅ DESPUÉS (campos correctos según tu backend)
      const userPayload = {
        id: res?.data?.id, // ✅ Correcto
        name: res?.data?.name, // ✅ Correcto
        email: res?.data?.email,
        rol: res?.data?.rol,
        estado: res?.data?.estado,
        telefono: res?.data?.telefono,
        id_establecimiento: res?.data?.id_establecimiento,
        permisos_especiales: res?.data?.permisos_especiales,
        fecha_creacion: res?.data?.fecha_creacion,
        fecha_actualizacion: res?.data?.fecha_actualizacion,
        ultimo_acceso: res?.data?.ultimo_acceso,
      };

      console.log("💾 Guardando userSelected:", userPayload);
      localStorage.setItem("userSelected", JSON.stringify(userPayload));

      // ✅ 3. Continuar con el flujo normal
      sessionLogin(true);
      dispatch(setStatusSessionUser(true));
      login(res?.data?.token);
    }
  });

  useEffect(() => {
    if (statusRegister === true) {
      const timer = setTimeout(() => {
        dispatch(setStatusRegister(false));
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [statusRegister, dispatch]);

  useEffect(() => {
    if (!authLoading && !routerLoading) {
      sessionLogin();
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
            className='w-1/4 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4'
          >
            {statusRegister && (
              <p className='bg-green-500 text-white text-center text-sm font-semibold p-2 rounded-md shadow-md mt-2 mb-5'>
                EL USUARIO SE HA REGISTRADO CORRECTAMENTE
              </p>
            )}

            <h1 className='font-bold text-4xl mb-4 text-gray-700'>
              Acceso Login
            </h1>

            <label
              htmlFor='email'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Email
            </label>
            <input
              type='email'
              placeholder='email@gmail.com'
              {...register("email", {
                required: "Email es requerido",
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.email && (
              <p className='text-red-500 text-xs'>{errors.email.message}</p>
            )}

            <label
              htmlFor='password'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Password
            </label>
            <input
              type='password'
              placeholder='password'
              {...register("password", {
                required: "Password es requerido",
                minLength: {
                  value: 8,
                  message: "Debe tener al menos 8 caracteres",
                },
              })}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.password && (
              <p className='text-red-500 text-xs'>{errors.password.message}</p>
            )}

            <button
              className='w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              type='submit'
            >
              Login
            </button>

            {userAlert?.status && (
              <p className='bg-red-500 text-white text-center text-sm font-semibold p-2 rounded-md shadow-md mt-2'>
                {userAlert?.message}
              </p>
            )}
          </form>
        </div>
      )}
    </ClientOnly>
  );
};

export default Login;
