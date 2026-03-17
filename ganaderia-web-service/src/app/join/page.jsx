"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { equipoService } from "@/api/equipoRepo";

function JoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [status, setStatus] = useState("cargando"); // cargando, exito, error, login_required, ya_miembro

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    // 1. Verificar si hay usuario logueado en LocalStorage
    const tokenAuth = localStorage.getItem("token");

    if (!tokenAuth) {
      // 🛑 NO LOGUEADO: Guardamos token pendiente y pedimos login/registro
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
      localStorage.removeItem("pendingInviteToken");

      // Redirigir al dashboard
      setTimeout(() => router.push("/"), 2500);
    } catch (error) {
      console.error(error);
      // 409 = ya eres miembro con esta cuenta (el token sigue válido para otro usuario)
      if (error?.response?.status === 409) {
        setStatus("ya_miembro");
      } else {
        setStatus("error");
      }
    }
  };

  // 👇 FUNCIÓN CLAVE: Guarda el token y redirige a la ruta correcta
  const navegarConBackup = (ruta) => {
    if (token && typeof window !== "undefined") {
      localStorage.setItem("backupToken", token); // 💾 Guardamos copia de seguridad
    }
    // Redirigimos pasando también el token en la URL
    router.push(`${ruta}?token=${token}`);
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
          </>
        )}

        {status === "login_required" && (
          <>
            <div className='text-5xl mb-4'>🔒</div>
            <h2 className='text-2xl font-bold text-gray-800 mb-2'>
              Inicia sesión primero
            </h2>
            <p className='text-gray-600 mb-6'>
              Para unirte al campo, necesitas acceder a tu cuenta.
            </p>

            <div className='flex flex-col gap-3'>
              {/* 👇 AQUÍ ESTÁ LA CLAVE: Debe decir /auth/register */}
              <button
                onClick={() => navegarConBackup("/auth/register")}
                className='w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg'
              >
                📝 Crear Cuenta Nueva
              </button>

              {/* 👇 AQUÍ TAMBIÉN: Debe decir /auth/login */}
              <button
                onClick={() => navegarConBackup("/auth/login")}
                className='w-full bg-white text-blue-600 border border-blue-200 py-3 rounded-lg font-bold hover:bg-gray-50 transition shadow-sm'
              >
                🔑 Ya tengo cuenta
              </button>
            </div>
          </>
        )}

        {status === "exito" && (
          <>
            <div className='text-5xl mb-4'>🎉</div>
            <h2 className='text-2xl font-bold text-green-600 mb-2'>
              ¡Bienvenido al Equipo!
            </h2>
            <p className='text-gray-600'>Te has unido exitosamente.</p>
            <p className='text-sm text-gray-400 mt-6 animate-pulse'>
              Entrando al sistema...
            </p>
          </>
        )}

        {status === "ya_miembro" && (
          <>
            <div className='text-5xl mb-4'>⚠️</div>
            <h2 className='text-2xl font-bold text-yellow-600 mb-2'>
              Cuenta incorrecta
            </h2>
            <p className='text-gray-600 mb-2'>
              Tu cuenta actual ya es parte de este equipo, o la invitación es para otra cuenta.
            </p>
            <p className='text-gray-500 text-sm mb-6'>
              Cerrá sesión e ingresá con el email al que llegó la invitación. El link sigue siendo válido.
            </p>
            <div className='flex flex-col gap-3'>
              <button
                onClick={() => {
                  localStorage.clear();
                  router.push(`/auth/login?token=${token}`);
                }}
                className='w-full bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition'
              >
                Cerrar sesión y reintentar
              </button>
              <button
                onClick={() => router.push("/")}
                className='text-blue-600 font-semibold hover:underline text-sm'
              >
                Volver al Inicio
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className='text-5xl mb-4'>❌</div>
            <h2 className='text-2xl font-bold text-red-600 mb-2'>
              Link Inválido
            </h2>
            <p className='text-gray-600 mb-6'>
              La invitación expiró o ya fue usada.
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

// AGREGÁ ESTO AL FINAL DE TODO
export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center bg-gray-100'>
          <div className='animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full'></div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
