"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";

// Hooks y Contextos propios
import { useAuthSession } from "@/hooks/auth";
import { useRouterSession } from "@/utils/routerSession";
import { setStatusRegister, setStatusSessionUser } from "@/store/register";
import { useAuthContext } from "@/context/authContext";
import ClientOnly from "@/components/ClientOnly";
import businessApi from "@/api/bussines-api";
import securityApi from "@/api/security-api";


const LoginContent = () => {
  const dispatch = useDispatch();

  const router = useRouter();
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
    (state) => state.register,
  );

  const onSubmit = handleSubmit(async (data) => {
    const userCredentials = {
      email: data.email,
      password: data.password,
    };

    // 1. Intentar Login
    const res = await loginHooks(userCredentials);
    console.log("📦 Respuesta del login:", res?.data);

    if (res === 401 || !res?.data) {
      setUserAlert({
        status: true,
        message: "ERROR: Credenciales incorrectas",
      });
    } else {
      // ✅ LOGIN EXITOSO

      // Guardar token y usuario en localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("token", res.data.token);

        const userPayload = {
          id: res.data.user.id,
          name: res.data.user.name,
          email: res.data.user.email,
          rol: res.data.user.rol,
          estado: res.data.user.estado,
          telefono: res.data.user.telefono,
          id_establecimiento: res.data.user.id_establecimiento,
          // ... otros campos que necesites
        };
        localStorage.setItem("userSelected", JSON.stringify(userPayload));
      }

      login(res.data.token);
      dispatch(setStatusSessionUser(true));

      // Guardar pendingToken antes de limpiar (puede ser invitación sin email)
      const pendingToken = localStorage.getItem("pendingInviteToken") || localStorage.getItem("backupToken");
      localStorage.removeItem("backupToken");
      localStorage.removeItem("pendingInviteToken");

      // Intentar aceptar invitaciones pendientes por email
      try {
        const result = await businessApi.post("/invitaciones/aceptar-automatico");
        if (result?.data?.aceptadas > 0) {
          // Hubo invitaciones procesadas → refrescar JWT con id_establecimiento actualizado
          const { data } = await securityApi.post("/auth/refresh");
          if (data?.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userSelected", JSON.stringify({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              rol: data.user.rol,
              estado: data.user.estado,
              telefono: data.user.telefono,
              id_establecimiento: data.user.id_establecimiento,
            }));
            login(data.token);
          }
        }
      } catch (err) {
        // Si falla (sin invitaciones o error), continuar normalmente
      }

      // Si había un token de invitación pendiente, procesarlo en /join
      if (pendingToken) {
        router.push(`/join?token=${pendingToken}`);
      } else {
        sessionLogin(true);
      }
    }
  });

  // Efecto para borrar mensaje de registro exitoso
  useEffect(() => {
    if (statusRegister === true) {
      const timer = setTimeout(() => {
        dispatch(setStatusRegister(false));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [statusRegister, dispatch]);

  // Efecto para verificar sesión inicial
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
            className='w-full sm:w-1/2 md:w-1/3 lg:w-1/4 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4'
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

            <div className='text-right mb-2'>
              <a
                href='/auth/forgot-password'
                className='text-xs text-indigo-500 hover:text-indigo-700'
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

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

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
