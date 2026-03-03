"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
// 👇 AJUSTADO: Import correcto
import { equipoService } from "@/api/equipoRepo";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [status, setStatus] = useState("cargando"); // cargando, exito, error, login_required

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    // 1. Verificar si hay usuario logueado en LocalStorage
    const tokenAuth = localStorage.getItem("token");

    if (!tokenAuth) {
      // 🛑 NO LOGUEADO: Guardamos el token para usarlo DESPUÉS del login
      localStorage.setItem("pendingInviteToken", token);
      setStatus("login_required");
      return;
    }

    // 2. ✅ LOGUEADO: Intentar unirse directo
    procesarInvitacion(token);
  }, [token]);

  const procesarInvitacion = async (t) => {
    try {
      await equipoService.unirseAlEquipo(t);
      setStatus("exito");
      localStorage.removeItem("pendingInviteToken"); // Limpiar token usado

      // Redirigir al dashboard en 2 segundos
      setTimeout(() => router.push("/"), 2500);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 p-4'>
      <div className='bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-200'>
        {status === "cargando" && (
          <>
            <div className='animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4'></div>
            <h2 className='text-xl font-bold text-gray-800'>
              Validando invitación... ⏳
            </h2>
            <p className='text-gray-500 mt-2'>Un momento por favor</p>
          </>
        )}

        {status === "login_required" && (
          <>
            <div className='text-5xl mb-4'>🔒</div>
            <h2 className='text-2xl font-bold text-gray-800 mb-2'>
              Inicia sesión primero
            </h2>
            <p className='text-gray-600 mb-6'>
              Para unirte al campo, necesitas acceder a tu cuenta o crear una.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className='w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg'
            >
              Ir a Login / Registro
            </button>
          </>
        )}

        {status === "exito" && (
          <>
            <div className='text-5xl mb-4'>🎉</div>
            <h2 className='text-2xl font-bold text-green-600 mb-2'>
              ¡Bienvenido al Equipo!
            </h2>
            <p className='text-gray-600'>
              Te has unido exitosamente al establecimiento.
            </p>
            <p className='text-sm text-gray-400 mt-6 animate-pulse'>
              Redirigiendo al panel...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className='text-5xl mb-4'>❌</div>
            <h2 className='text-2xl font-bold text-red-600 mb-2'>
              Link Inválido
            </h2>
            <p className='text-gray-600 mb-6'>
              La invitación expiró, ya fue usada o ya eres miembro del equipo.
            </p>
            <button
              onClick={() => router.push("/")}
              className='text-blue-600 font-semibold hover:underline'
            >
              Volver al Inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
