"use client";

import React, { useState } from "react";
import { useAuthSession } from "@/hooks/auth";

export default function ForgotPasswordPage() {
  const { forgotPasswordHook } = useAuthSession();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    const res = await forgotPasswordHook(email);
    setLoading(false);

    if (res.success) {
      setSent(true);
    } else {
      setError("Ocurrió un error. Intentá de nuevo.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] flex justify-center items-center px-4 py-6">
      <div className="w-full sm:w-10/12 md:w-1/2 lg:w-1/3 xl:w-1/4 bg-white shadow-md rounded-xl px-6 sm:px-8 pt-6 pb-8">
        <h1 className="font-bold text-2xl mb-2 text-gray-700">Recuperar contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ingresá tu email y te enviamos un link para resetear tu contraseña.
        </p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 text-center">
            ✅ Si el email existe, recibirás un correo en breve.
            <br />
            <a href="/auth/login" className="mt-3 inline-block text-indigo-600 hover:underline text-sm">
              Volver al login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
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
              {loading ? "Enviando..." : "Enviar link de recuperación"}
            </button>

            <div className="text-center">
              <a href="/auth/login" className="text-sm text-gray-500 hover:text-indigo-600">
                Volver al login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
