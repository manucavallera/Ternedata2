"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAuthSession } from "@/hooks/auth";

export default function PerfilPage() {
  const { userPayload } = useSelector((state) => state.auth);
  const { getProfileHook, updateProfileHook } = useAuthSession();

  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  // Formulario de datos
  const [formDatos, setFormDatos] = useState({ name: "", email: "", telefono: "" });
  const [savingDatos, setSavingDatos] = useState(false);
  const [alertDatos, setAlertDatos] = useState(null);

  // Formulario de contraseña
  const [formPassword, setFormPassword] = useState({ password: "", confirmar: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [alertPassword, setAlertPassword] = useState(null);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    setLoading(true);
    const res = await getProfileHook();
    if (res.success) {
      setPerfil(res.data);
      setFormDatos({
        name: res.data.name || "",
        email: res.data.email || "",
        telefono: res.data.telefono || "",
      });
    }
    setLoading(false);
  };

  const handleGuardarDatos = async (e) => {
    e.preventDefault();
    setSavingDatos(true);
    setAlertDatos(null);

    const res = await updateProfileHook(perfil.id, {
      name: formDatos.name,
      email: formDatos.email,
      telefono: formDatos.telefono || undefined,
    });

    setSavingDatos(false);
    if (res.success) {
      setPerfil(res.data);
      setAlertDatos({ type: "success", message: "Datos actualizados correctamente." });
      // Actualizar localStorage
      if (typeof window !== "undefined") {
        const stored = JSON.parse(localStorage.getItem("userSelected") || "{}");
        localStorage.setItem("userSelected", JSON.stringify({ ...stored, name: res.data.name, email: res.data.email }));
      }
    } else {
      setAlertDatos({ type: "error", message: res.message || "Error al actualizar datos." });
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setAlertPassword(null);

    if (formPassword.password.length < 6) {
      setAlertPassword({ type: "error", message: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    if (formPassword.password !== formPassword.confirmar) {
      setAlertPassword({ type: "error", message: "Las contraseñas no coinciden." });
      return;
    }

    setSavingPassword(true);
    const res = await updateProfileHook(perfil.id, { password: formPassword.password });
    setSavingPassword(false);

    if (res.success) {
      setFormPassword({ password: "", confirmar: "" });
      setAlertPassword({ type: "success", message: "Contraseña cambiada correctamente." });
    } else {
      setAlertPassword({ type: "error", message: res.message || "Error al cambiar contraseña." });
    }
  };

  const ROL_COLORS = {
    admin: "bg-purple-100 text-purple-800",
    veterinario: "bg-green-100 text-green-800",
    operario: "bg-blue-100 text-blue-800",
    super_admin: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Cabecera de perfil */}
        <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {perfil?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{perfil?.name}</h1>
            <p className="text-sm text-gray-500">{perfil?.email}</p>
            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold ${ROL_COLORS[perfil?.rol] || "bg-gray-100 text-gray-700"}`}>
              {perfil?.rol?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Formulario de datos */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Mis datos</h2>
          <form onSubmit={handleGuardarDatos} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formDatos.name}
                onChange={(e) => setFormDatos({ ...formDatos, name: e.target.value })}
                required
                minLength={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formDatos.email}
                onChange={(e) => setFormDatos({ ...formDatos, email: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="tel"
                value={formDatos.telefono}
                onChange={(e) => setFormDatos({ ...formDatos, telefono: e.target.value })}
                placeholder="+54 379 4123456"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {alertDatos && (
              <p className={`text-sm p-2 rounded ${alertDatos.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {alertDatos.message}
              </p>
            )}

            <button
              type="submit"
              disabled={savingDatos}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {savingDatos ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>

        {/* Formulario de contraseña */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Cambiar contraseña</h2>
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={formPassword.password}
                onChange={(e) => setFormPassword({ ...formPassword, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={formPassword.confirmar}
                onChange={(e) => setFormPassword({ ...formPassword, confirmar: e.target.value })}
                placeholder="Repetí la contraseña"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {alertPassword && (
              <p className={`text-sm p-2 rounded ${alertPassword.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {alertPassword.message}
              </p>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {savingPassword ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
