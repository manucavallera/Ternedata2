"use client";

import React, { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/auth";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { setStatusRegister } from "@/store/register";
import { useRouterSession } from "@/utils/routerSession";
import { useAuthContext } from "@/context/authContext";
import ClientOnly from "@/components/ClientOnly";

const Registercomponent = () => {
  // usamos dispatch para asignar valor al payload estado de register
  const dispatch = useDispatch();

  // utilizamos el hooks para registrar el usuario
  const { registroHooks } = useAuthSession();

  // AQUI VEMOS LA RUTA QUE VA SEGUIR
  const { sessionRegister, isLoading: routerLoading } = useRouterSession();
  const { isLoading: authLoading } = useAuthContext();

  const { statusSessionUser } = useSelector((state) => state.register);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [userAlert, setuserAlert] = useState({ status: false, message: "" });

  const onSubmit = handleSubmit(async (data) => {
    if (data.password === data.confirmPassword) {
      const newUser = {
        name: data.username,
        email: data.email,
        password: data.password,
      };
      const res = await registroHooks(newUser);
      if (res === 500) {
        const dataAlert = {
          status: true,
          message: "ERROR, USUARIO REGISTRADO",
        };
        sessionRegister(false);
        setuserAlert(dataAlert);
      } else {
        dispatch(setStatusRegister(true));
        sessionRegister(true);
      }
    } else {
      sessionRegister(false);
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
            className='w-1/4 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4'
          >
            <h1 className='font-bold text-4xl mb-4 text-gray-700'>Registro</h1>
            <label
              htmlFor='username'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Username
            </label>
            <input
              type='text'
              placeholder='name'
              {...register("username", {
                required: {
                  value: true,
                  message: "Username es requerido",
                },
                pattern: /^[a-zA-Z0-9]+$/i,
                maxLength: 20,
                minLength: 2,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.username && (
              <p className='text-red-500 text-xs'>{errors.username.message}</p>
            )}
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
                required: {
                  value: true,
                  message: "Email es requerido",
                },
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                maxLength: 50,
                minLength: 5,
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
                required: {
                  value: true,
                  message: "Password es requerido",
                },
                maxLength: 20,
                minLength: 8,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.password && (
              <p className='text-red-500 text-xs'>{errors.password.message}</p>
            )}
            <label
              htmlFor='confirmPassword'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Confirm Password
            </label>
            <input
              type='password'
              placeholder='repeat password'
              {...register("confirmPassword", {
                required: {
                  value: true,
                  message: "Password es requerido",
                },
                maxLength: 20,
                minLength: 8,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.confirmPassword && (
              <p className='text-red-500 text-xs'>
                {errors.confirmPassword.message}
              </p>
            )}
            <button
              className='w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              type='submit'
            >
              Register
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

export default Registercomponent;
