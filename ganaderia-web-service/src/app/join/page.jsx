"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { equipoService } from "@/api/equipoRepo";
import securityApi from "@/api/security-api";

function JoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const router = useRouter();
  const [status, setStatus] = useState("cargando");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const tokenAuth = localStorage.getItem("token");

    if (!tokenAuth) {
      localStorage.setItem("pendingInviteToken", token);
      setStatus("login_required");
      return;
    }

    // Si la invitación tiene email y hay un usuario logueado con distinto email → sesión incorrecta
    if (email) {
      try {
        const userSelected = JSON.parse(
          localStorage.getItem("userSelected") || "{}",
        );
        if (
          userSelected.email &&
          userSelected.email.toLowerCase() !== email.toLowerCase()
        ) {
          // El usuario logueado no es el destinatario → limpiar sesión y pedir login
          localStorage.removeItem("token");
          localStorage.removeItem("userSelected");
          localStorage.removeItem("NEXT_JS_AUTH");
          localStorage.setItem("pendingInviteToken", token);
          setStatus("login_required");
          return;
        }
      } catch {}
    }

    procesarInvitacion(token);
  }, [token]);

  const refrescarYRedirigir = async () => {
    try {
      const { data } = await securityApi.post("/auth/refresh");
      if (data?.token) {
        localStorage.setItem("token", data.token);
        const userPayload = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          rol: data.user.rol,
          estado: data.user.estado,
          telefono: data.user.telefono,
          id_establecimiento: data.user.id_establecimiento,
        };
        localStorage.setItem("userSelected", JSON.stringify(userPayload));
        localStorage.setItem("NEXT_JS_AUTH", data.token);
      }
    } catch {
      // Si falla el refresh, forzar re-login
      localStorage.removeItem("token");
      localStorage.removeItem("userSelected");
      localStorage.removeItem("NEXT_JS_AUTH");
      window.location.href = "/auth/login";
      return;
    }
    window.location.href = "/admin/dashboard";
  };

  const procesarInvitacion = async (t) => {
    try {
      await equipoService.unirseAlEquipo(t);
      setStatus("exito");
      localStorage.removeItem("pendingInviteToken");
      // Refrescar JWT con el nuevo id_establecimiento y redirigir al dashboard
      await refrescarYRedirigir();
    } catch (error) {
      // 409 = ya eres miembro: el join YA ocurrió antes, solo refrescar JWT
      if (error?.response?.status === 409) {
        setStatus("ya_miembro_refresh");
        await refrescarYRedirigir();
      } else {
        setStatus("error");
      }
    }
  };

  const navegarConBackup = (ruta) => {
    if (token && typeof window !== "undefined") {
      localStorage.setItem("backupToken", token);
    }
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : "";
    router.push(`${ruta}?token=${token}${emailParam}`);
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 p-4'>
      <div className='bg-white p-5 sm:p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-200'>
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
              Iniciá sesión primero
            </h2>
            <p className='text-gray-600 mb-6'>
              Para unirte al campo, necesitás acceder a tu cuenta.
            </p>
            <div className='flex flex-col gap-3'>
              <button
                onClick={() => navegarConBackup("/auth/register")}
                className='w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg'
              >
                📝 Crear Cuenta Nueva
              </button>
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
              Redirigiendo al login para actualizar tu sesión...
            </p>
          </>
        )}

        {status === "ya_miembro_refresh" && (
          <>
            <div className='animate-spin h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4'></div>
            <h2 className='text-xl font-bold text-gray-800'>
              Ya sos parte del equipo. Actualizando sesión...
            </h2>
          </>
        )}

        {status === "error" && (
          <>
            <div className='text-5xl mb-4'>❌</div>
            <h2 className='text-2xl font-bold text-red-600 mb-2'>
              Link inválido o expirado
            </h2>
            <p className='text-gray-600 mb-2'>
              Este link ya fue usado o expiró.
            </p>
            <p className='text-gray-500 text-sm mb-6'>
              Pedile al administrador que genere un nuevo link de invitación.
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
