"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/auth";

const VerifyEmailContent = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { verifyEmailHook, resendVerificationHook } = useAuthSession();

  // estado: 'verificando' | 'ok' | 'error'
  const [estado, setEstado] = useState(token ? "verificando" : "error");
  const [mensaje, setMensaje] = useState("");
  const [reenviarEmail, setReenviarEmail] = useState("");
  const [reenviado, setReenviado] = useState(false);

  useEffect(() => {
    if (!token) return;
    let activo = true;
    (async () => {
      const res = await verifyEmailHook(token);
      if (!activo) return;
      if (res.success) {
        setEstado("ok");
        setMensaje(res.data?.message || "Email verificado. Ya podés iniciar sesión.");
      } else {
        setEstado("error");
        setMensaje(res.message || "Link inválido o expirado. Pedí uno nuevo.");
      }
    })();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleReenviar = async (e) => {
    e.preventDefault();
    if (!reenviarEmail) return;
    await resendVerificationHook(reenviarEmail);
    setReenviado(true);
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] flex justify-center items-center px-4 py-6">
      <div className="w-full sm:w-10/12 md:w-1/2 lg:w-1/3 xl:w-1/4 bg-white shadow-md rounded-xl px-6 sm:px-8 pt-6 pb-8 text-center">
        <h1 className="font-bold text-2xl mb-4 text-gray-700">Verificación de email</h1>

        {estado === "verificando" && (
          <p className="text-gray-500">Verificando tu cuenta...</p>
        )}

        {estado === "ok" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            ✅ {mensaje}
            <br />
            <a href="/auth/login" className="mt-3 inline-block text-indigo-600 hover:underline">
              Ir al login
            </a>
          </div>
        )}

        {estado === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {mensaje}
            </div>

            {reenviado ? (
              <p className="text-sm text-green-700">
                Si la cuenta existe y no está verificada, te enviamos un nuevo email. Revisá tu casilla.
              </p>
            ) : (
              <form onSubmit={handleReenviar} className="space-y-3 text-left">
                <label className="block text-gray-700 text-sm font-bold">
                  Reenviar verificación
                </label>
                <input
                  type="email"
                  value={reenviarEmail}
                  onChange={(e) => setReenviarEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Reenviar email
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Cargando...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
