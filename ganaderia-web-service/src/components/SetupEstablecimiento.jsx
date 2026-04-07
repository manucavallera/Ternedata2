"use client";

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { setAuthPayload, setUserData } from "@/store/auth/authSlice";
import securityApi from "@/api/security-api";

const SetupEstablecimiento = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { crearEstablecimientoHook } = useBussinesMicroservicio();

  const [form, setForm] = useState({ nombre: "", ubicacion: "", responsable: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError("El nombre del establecimiento es obligatorio.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await crearEstablecimientoHook(form);
      if (res?.data?.id_establecimiento) {
        setExito(true);
        // Obtener JWT fresco con el nuevo establecimiento incluido
        const { data } = await securityApi.post("/auth/refresh");
        if (data?.token) {
          // Mismo formato que usa el login
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
          dispatch(setAuthPayload(data.token));
          dispatch(setUserData(userPayload));
        }
        router.push("/admin/dashboard");
      } else {
        setError("Error al crear el establecimiento. Intentá de nuevo.");
      }
    } catch (err) {
      setError("Error al crear el establecimiento. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md border border-gray-200">

        {exito ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">¡Establecimiento creado!</h2>
            <p className="text-gray-500 text-sm animate-pulse">Redirigiendo al dashboard...</p>
          </div>
        ) : (
          <>
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏡</div>
          <h2 className="text-2xl font-bold text-gray-800">Creá tu establecimiento</h2>
          <p className="text-gray-500 text-sm mt-2">
            Antes de empezar, configurá los datos de tu campo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del campo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: La Esperanza"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.ubicacion}
              onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
              placeholder="Ej: Buenos Aires, Argentina"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsable <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.responsable}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              placeholder="Ej: Juan Pérez"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg py-3 transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? "Creando..." : "Crear establecimiento"}
          </button>
        </form>
        </>
        )}
      </div>
    </div>
  );
};

export default SetupEstablecimiento;
