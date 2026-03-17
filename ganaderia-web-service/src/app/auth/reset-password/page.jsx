"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/auth";

const ResetPasswordContent = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { resetPasswordHook } = useAuthSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!token) {
      setError("Token inválido. Solicitá un nuevo link.");
      return;
    }

    setLoading(true);
    const res = await resetPasswordHook(token, newPassword);
    setLoading(false);

    if (res.success) {
      setDone(true);
    } else {
      setError(res.message || "Token inválido o expirado. Solicitá un nuevo link.");
    }
  };

  if (!token) {
    return (
      <div className="h-[calc(100vh-7rem)] flex justify-center items-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700 max-w-sm">
          Link inválido. <br />
          <a href="/auth/forgot-password" className="mt-2 inline-block text-indigo-600 hover:underline">
            Solicitar nuevo link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex justify-center items-center">
      <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h1 className="font-bold text-2xl mb-2 text-gray-700">Nueva contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">Ingresá tu nueva contraseña.</p>

        {done ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 text-center">
            ✅ Contraseña actualizada correctamente.
            <br />
            <a href="/auth/login" className="mt-3 inline-block text-indigo-600 hover:underline text-sm">
              Ir al login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                required
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p className="bg-red-100 text-red-700 text-xs p-2 rounded">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Cargando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
