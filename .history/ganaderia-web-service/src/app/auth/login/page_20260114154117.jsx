"use client";

import { useAuthSession } from "@/hooks/auth";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useRouterSession } from "@/utils/routerSession";
import { setStatusRegister, setStatusSessionUser } from "@/store/register";
import { useAuthContext } from "@/context/authContext";
import ClientOnly from "@/components/ClientOnly";
// 👇 IMPORTAMOS LO NECESARIO PARA UNIRSE
import { useSearchParams } from "next/navigation";
import { equipoService } from "@/api/equipoRepo";

const Login = () => {
  const dispatch = useDispatch();

  const { loginHooks } = useAuthSession();
  const { sessionLogin, isLoading: routerLoading } = useRouterSession();
  const { login, isLoading: authLoading } = useAuthContext();
  const searchParams = useSearchParams(); // 👈 Para leer URL

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

    console.log("📦 Respuesta del login:", res?.data);

    if (res === 401) {
      setUserAlert({
        status: true,
        message: "ERROR: Credenciales incorrectas",
      });
    } else {
      localStorage.setItem("token", res?.data?.token);

      const userPayload = {
        id: res?.data?.user?.id,
        name: res?.data?.user?.name,
        email: res?.data?.user?.email,
        rol: res?.data?.user?.rol,
        estado: res?.data?.user?.estado,
        telefono: res?.data?.user?.telefono,
        id_establecimiento: res?.data?.user?.id_establecimiento,
        permisos_especiales: res?.data?.user?.permisos_especiales,
        fecha_creacion: res?.data?.user?.fecha_creacion,
        fecha_actualizacion: res?.data?.user?.fecha_actualizacion,
        ultimo_acceso: res?.data?.user?.ultimo_acceso,
      };

      console.log("💾 Guardando userSelected:", userPayload);
      localStorage.setItem("userSelected", JSON.stringify(userPayload));

      // 👇👇 AQUÍ ESTÁ LA MAGIA DE LA INVITACIÓN 👇👇
      // Verificamos si hay token en URL o en Backup
      let tokenDeInvitacion = searchParams.get("token");
      if (!tokenDeInvitacion && typeof window !== 'undefined') {
          tokenDeInvitacion = localStorage.getItem("backupToken");
      }

      if (tokenDeInvitacion) {
        try {
            console.log("🚀 Ejecutando unión automática con token:", tokenDeInvitacion);
            // Intentamos unirnos al equipo usando el token
            await equipoService.unirseAlEquipo(tokenDeInvitacion);
            
            // Limpiamos el backup si funcionó
            localStorage.removeItem("backupToken");
            
            alert("¡Login exitoso y te has unido al equipo correctamente!");
        } catch (error) {
            console.error("Error al unirse tras login:", error);
            // No bloqueamos el login, pero avisamos por consola
        }
      }
      // 👆👆 FIN DE LA MAGIA 👆👆

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

  // ... (RESTO DEL RETURN IGUAL QUE ANTES) ...
  return (
    <ClientOnly fallback={...}>
      {/* ... Tu formulario de siempre ... */}
       {statusSessionUser === false && (
        <div className='h-[calc(100vh-7rem)] flex justify-center items-center'>
          <form
            onSubmit={onSubmit}
            className='w-1/4 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4'
          >
             {/* ... Inputs ... */}
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