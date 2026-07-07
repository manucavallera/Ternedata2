"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const hoyISO = () => new Date().toISOString().slice(0, 10);

const money = (n) =>
  "$ " +
  (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const num = (n, d = 2) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });

const FORM_INICIAL = {
  fecha: hoyISO(),
  numero_terneros: "1",
  litros_por_ternero: "4",
  tomas_manana: "2",
  tomas_tarde: "2",
  concentracion: "0.125",
  precio_sustituto_usd: "",
  precio_leche: "",
  cotizacion_dolar: "",
  observaciones: "",
};

// Mismo cálculo que el backend, para previsualizar en vivo antes de guardar.
const calcular = (f) => {
  const terneros = Number(f.numero_terneros) || 0;
  const litrosTernero = Number(f.litros_por_ternero) || 0;
  const conc = Number(f.concentracion) || 0;
  const usd = Number(f.precio_sustituto_usd) || 0;
  const leche = Number(f.precio_leche) || 0;
  const dolar = Number(f.cotizacion_dolar) || 0;
  const litros_totales = terneros * litrosTernero;
  const kg_sustituto = litros_totales * conc;
  const costo_sustituto_dia = kg_sustituto * usd * dolar;
  const costo_leche_dia = litros_totales * leche;
  const ahorro = costo_leche_dia - costo_sustituto_dia;
  return {
    litros_totales,
    kg_sustituto,
    costo_sustituto_dia,
    costo_leche_dia,
    ahorro,
    conviene: costo_sustituto_dia < costo_leche_dia ? "sustituto" : "leche",
  };
};

const SustitutoSeccion = () => {
  const { registrarSustitutoHook, obtenerSustitutoHook, eliminarSustitutoHook } =
    useBussinesMicroservicio();

  const [form, setForm] = useState(FORM_INICIAL);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  // Keyed solo en `reload` (primitivo) — NO meter los hooks en deps (loop -> 429).
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data, error: err } = await obtenerSustitutoHook();
      if (cancelado) return;
      if (err) setError("No se pudo cargar el historial.");
      else setRegistros(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  const preview = useMemo(() => calcular(form), [form]);

  const onChange = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.precio_sustituto_usd || !form.precio_leche || !form.cotizacion_dolar) {
      setError("Completá precio sustituto, precio leche y cotización del dólar.");
      return;
    }
    setGuardando(true);
    const payload = {
      fecha: form.fecha,
      numero_terneros: parseInt(form.numero_terneros, 10) || 0,
      litros_por_ternero: Number(form.litros_por_ternero) || 0,
      tomas_manana: Number(form.tomas_manana) || 0,
      tomas_tarde: Number(form.tomas_tarde) || 0,
      concentracion: Number(form.concentracion) || 0.125,
      precio_sustituto_usd: Number(form.precio_sustituto_usd) || 0,
      precio_leche: Number(form.precio_leche) || 0,
      cotizacion_dolar: Number(form.cotizacion_dolar) || 0,
      observaciones: form.observaciones || undefined,
    };
    const { error: err } = await registrarSustitutoHook(payload);
    setGuardando(false);
    if (err) {
      setError("No se pudo guardar el cálculo.");
      return;
    }
    setForm((f) => ({ ...FORM_INICIAL, cotizacion_dolar: f.cotizacion_dolar }));
    setReload((r) => r + 1);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este cálculo?")) return;
    const { error: err } = await eliminarSustitutoHook(id);
    if (!err) setReload((r) => r + 1);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">🍼</span>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          Cálculo de sustituto lácteo
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Calculá el sustituto que necesitás por día y compará el costo contra dar
        leche real.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- Form --- */}
        <form
          onSubmit={guardar}
          className="bg-white rounded-xl shadow border border-gray-100 p-4 space-y-3 h-fit"
        >
          <Campo label="Fecha">
            <input
              type="date"
              value={form.fecha}
              onChange={onChange("fecha")}
              className="input"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número de terneros">
              <input
                type="number"
                min="0"
                value={form.numero_terneros}
                onChange={onChange("numero_terneros")}
                className="input"
              />
            </Campo>
            <Campo label="Litros por ternero">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.litros_por_ternero}
                onChange={onChange("litros_por_ternero")}
                className="input"
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Toma mañana (L)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.tomas_manana}
                onChange={onChange("tomas_manana")}
                className="input"
              />
            </Campo>
            <Campo label="Toma tarde (L)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.tomas_tarde}
                onChange={onChange("tomas_tarde")}
                className="input"
              />
            </Campo>
          </div>

          <Campo label="Concentración (kg/L) — 12,5% = 0,125">
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.concentracion}
              onChange={onChange("concentracion")}
              className="input"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Precio sustituto (u$s/Kg)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precio_sustituto_usd}
                onChange={onChange("precio_sustituto_usd")}
                className="input"
                placeholder="3.20"
              />
            </Campo>
            <Campo label="Cotización dólar ($)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cotizacion_dolar}
                onChange={onChange("cotizacion_dolar")}
                className="input"
                placeholder="1380"
              />
            </Campo>
          </div>

          <Campo label="Precio leche ($/L)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.precio_leche}
              onChange={onChange("precio_leche")}
              className="input"
              placeholder="500"
            />
          </Campo>

          <Campo label="Observaciones (opcional)">
            <input
              type="text"
              value={form.observaciones}
              onChange={onChange("observaciones")}
              className="input"
            />
          </Campo>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors"
          >
            {guardando ? "Guardando…" : "Guardar cálculo"}
          </button>
        </form>

        {/* --- Resultado en vivo --- */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 h-fit">
          <h2 className="font-semibold text-gray-700 mb-3">Resultado</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Dato label="Litros totales" valor={`${num(preview.litros_totales)} L`} />
            <Dato label="Kg de sustituto" valor={`${num(preview.kg_sustituto, 3)} kg`} />
          </div>

          <div className="space-y-2">
            <Fila
              color="orange"
              label="Costo sustituto / día"
              valor={money(preview.costo_sustituto_dia)}
            />
            <Fila
              color="blue"
              label="Costo leche real / día"
              valor={money(preview.costo_leche_dia)}
            />
          </div>

          <div
            className={`mt-4 rounded-lg px-3 py-3 text-sm font-semibold ${
              preview.conviene === "sustituto"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            {preview.conviene === "sustituto" ? (
              <>Conviene el sustituto — ahorrás {money(Math.abs(preview.ahorro))} / día</>
            ) : (
              <>Conviene la leche real — el sustituto sale {money(Math.abs(preview.ahorro))} más / día</>
            )}
          </div>
        </div>
      </div>

      {/* --- Historial --- */}
      <div className="mt-8">
        <h2 className="font-semibold text-gray-700 mb-3">Historial</h2>
        {loading ? (
          <p className="text-gray-400 text-sm">Cargando…</p>
        ) : registros.length === 0 ? (
          <p className="text-gray-400 text-sm">Todavía no hay cálculos guardados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Terneros</th>
                  <th className="py-2 pr-3">Litros</th>
                  <th className="py-2 pr-3">Kg sust.</th>
                  <th className="py-2 pr-3">Costo sust.</th>
                  <th className="py-2 pr-3">Costo leche</th>
                  <th className="py-2 pr-3">Conviene</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id_calculo} className="border-b border-gray-50">
                    <td className="py-2 pr-3">{r.fecha}</td>
                    <td className="py-2 pr-3">{r.numero_terneros}</td>
                    <td className="py-2 pr-3">{num(r.litros_totales)} L</td>
                    <td className="py-2 pr-3">{num(r.kg_sustituto, 3)}</td>
                    <td className="py-2 pr-3">{money(r.costo_sustituto_dia)}</td>
                    <td className="py-2 pr-3">{money(r.costo_leche_dia)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          r.conviene === "sustituto"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {r.conviene}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => eliminar(r.id_calculo)}
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

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.625rem;
          font-size: 0.875rem;
          color: #374151;
        }
        .input:focus {
          outline: none;
          border-color: #16a34a;
        }
      `}</style>
    </div>
  );
};

const Campo = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs text-gray-500 mb-1">{label}</span>
    {children}
  </label>
);

const Dato = ({ label, valor }) => (
  <div className="bg-gray-50 rounded-lg p-3 text-center">
    <div className="text-lg font-bold text-gray-800">{valor}</div>
    <div className="text-[11px] text-gray-500">{label}</div>
  </div>
);

const Fila = ({ label, valor, color }) => {
  const bg =
    color === "orange"
      ? "bg-orange-50 text-orange-800"
      : "bg-blue-50 text-blue-800";
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${bg}`}>
      <span className="text-sm">{label}</span>
      <span className="font-bold">{valor}</span>
    </div>
  );
};

export default SustitutoSeccion;
