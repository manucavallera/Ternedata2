"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const hoyISO = () => new Date().toISOString().slice(0, 10);

const ListadoLitros = () => {
  const { userPayload, establecimientoActual } = useSelector(
    (state) => state.auth
  );
  const {
    registrarLitrosHook,
    obtenerLitrosHook,
    obtenerStatsLitrosHook,
    eliminarLitrosHook,
    actualizarLitrosHook,
  } = useBussinesMicroservicio();

  const [stats, setStats] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [ajustandoVacas, setAjustandoVacas] = useState(false);

  const [form, setForm] = useState({
    fecha: hoyISO(),
    litros_vendido: "",
    litros_terneros: "",
    cantidad_vacas: "",
    observaciones: "",
  });

  const idEstab =
    userPayload?.rol === "admin" && establecimientoActual
      ? establecimientoActual
      : null;

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resStats, resList] = await Promise.all([
        obtenerStatsLitrosHook(idEstab),
        obtenerLitrosHook(idEstab),
      ]);
      if (resStats?.status === 200) setStats(resStats.data);
      if (resList?.status === 200) setRegistros(resList.data || []);
    } catch {
      setError("Error al cargar los datos de litros.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEstab]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const payload = {
      fecha: form.fecha,
      litros_vendido: parseFloat(form.litros_vendido) || 0,
      litros_terneros: parseFloat(form.litros_terneros) || 0,
      observaciones: form.observaciones || undefined,
    };
    if (form.cantidad_vacas !== "")
      payload.cantidad_vacas = parseInt(form.cantidad_vacas, 10);
    if (idEstab) payload.id_establecimiento = idEstab;

    const res = await registrarLitrosHook(payload);
    if (res?.status === 201 || res?.status === 200) {
      setForm({
        fecha: hoyISO(),
        litros_vendido: "",
        litros_terneros: "",
        cantidad_vacas: "",
        observaciones: "",
      });
      await cargar();
    } else {
      setError(res?.data?.message || "No se pudo registrar.");
    }
    setGuardando(false);
  };

  const onEliminar = async (id) => {
    if (!confirm("¿Eliminar este registro de litros?")) return;
    setError(null);
    const res = await eliminarLitrosHook(id, idEstab);
    if (res?.status === 200) {
      await cargar();
    } else {
      setError(res?.data?.message || "No se pudo eliminar el registro.");
    }
  };

  // +/- sobre las vacas ordeñadas del último registro (días de tratamiento se
  // restan algunas). Ajusta ese registro, no toca el rodeo.
  const ajustarVacas = async (delta) => {
    if (!stats?.id_registro) return;
    const nuevo = Math.max(0, (stats.cantidad_vacas || 0) + delta);
    setAjustandoVacas(true);
    setError(null);
    const res = await actualizarLitrosHook(
      stats.id_registro,
      { cantidad_vacas: nuevo },
      idEstab
    );
    if (res?.status === 200) {
      await cargar();
    } else {
      setError(res?.data?.message || "No se pudo ajustar las vacas.");
    }
    setAjustandoVacas(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        🥛 Litros de leche
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Resumen (último registro) */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        stats && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mb-6">
            <div className="text-sm text-gray-500 mb-3">
              {stats.fecha
                ? `Último registro: ${new Date(
                    stats.fecha
                  ).toLocaleDateString("es-AR")}`
                : "Sin registros aún"}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 font-semibold">
                  Vendido
                </div>
                <div className="text-xl font-bold text-blue-700">
                  {stats.litros_vendido} lts
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-xs text-amber-600 font-semibold">
                  Terneros
                </div>
                <div className="text-xl font-bold text-amber-700">
                  {stats.litros_terneros} lts
                </div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-xs text-emerald-600 font-semibold">
                  Total
                </div>
                <div className="text-xl font-bold text-emerald-700">
                  {stats.total} lts
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 font-semibold">
                  Vacas (tambo)
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => ajustarVacas(-1)}
                    disabled={ajustandoVacas || !stats.id_registro}
                    aria-label="Restar una vaca"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-40"
                  >
                    −
                  </button>
                  <div className="text-xl font-bold text-gray-700 min-w-[2ch] text-center">
                    {stats.cantidad_vacas}
                  </div>
                  <button
                    type="button"
                    onClick={() => ajustarVacas(1)}
                    disabled={ajustandoVacas || !stats.id_registro}
                    aria-label="Sumar una vaca"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3">
                <div className="text-xs text-cyan-600 font-semibold">
                  Promedio/vaca
                </div>
                <div className="text-xl font-bold text-cyan-700">
                  {stats.promedio != null ? `${stats.promedio} lts` : "—"}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Formulario de carga */}
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mb-6"
      >
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Anotar litros
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Litros vendidos
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.litros_vendido}
              onChange={(e) =>
                setForm({ ...form, litros_vendido: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Ej: 1835"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Litros terneros
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.litros_terneros}
              onChange={(e) =>
                setForm({ ...form, litros_terneros: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Ej: 58"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Vacas en ordeñe (opcional)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.cantidad_vacas}
              onChange={(e) =>
                setForm({ ...form, cantidad_vacas: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder={
                stats?.cantidad_vacas != null
                  ? `Rodeo: ${stats.cantidad_vacas}`
                  : "Ej: 71"
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Observaciones (opcional)
            </label>
            <input
              type="text"
              value={form.observaciones}
              onChange={(e) =>
                setForm({ ...form, observaciones: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="mt-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          {guardando ? "Guardando..." : "Registrar"}
        </button>
      </form>

      {/* Historial */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-700 p-4 border-b">
          Historial
        </h2>
        {registros.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Todavía no cargaste litros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-right">Vendido</th>
                  <th className="px-4 py-2 text-right">Terneros</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-left">Obs.</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id_registro} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      {new Date(r.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-2 text-right">{r.litros_vendido}</td>
                    <td className="px-4 py-2 text-right">{r.litros_terneros}</td>
                    <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                      {r.total}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {r.observaciones || "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onEliminar(r.id_registro)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListadoLitros;
