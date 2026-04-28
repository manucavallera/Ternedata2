"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import FormularioPrincipal from "@/components/secciones/ingreso/Formulario-Principal";
import Listadoseccion from "@/components/secciones/listado/Listado-seccion";
import SetupEstablecimiento from "@/components/SetupEstablecimiento";

// ─── KPI Card ────────────────────────────────────────────────
const KPICard = ({ titulo, valor, subtitulo, color, icono, alerta }) => (
  <div
    className={`relative flex flex-col gap-1 p-4 rounded-xl shadow-lg border ${
      alerta
        ? "border-red-500 bg-red-950/40"
        : "border-slate-700 bg-slate-800/80"
    } backdrop-blur-sm`}
  >
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icono}</span>
      {alerta && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-semibold animate-pulse">
          Alerta
        </span>
      )}
    </div>
    <p className={`text-3xl font-extrabold mt-1 ${color}`}>{valor}</p>
    <p className="text-sm font-medium text-slate-300">{titulo}</p>
    {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
  </div>
);

// ─── Tabla de alertas ────────────────────────────────────────
const TablaAlertas = ({ alertas }) => {
  if (!alertas?.length) return null;
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-red-400 mb-3 flex items-center gap-2">
        ⚠️ Terneros con bajo crecimiento (&lt; 0.5 kg/día)
        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
          {alertas.length}
        </span>
      </h3>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-sm text-slate-300 bg-slate-800">
          <thead className="bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">RP Ternero</th>
              <th className="px-4 py-2 text-left">Días de vida</th>
              <th className="px-4 py-2 text-left">Último peso</th>
              <th className="px-4 py-2 text-left">Ganancia/día</th>
            </tr>
          </thead>
          <tbody>
            {alertas.map((t) => (
              <tr
                key={t.id_ternero}
                className="border-t border-slate-700 hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-4 py-2 font-semibold text-red-300">
                  {t.rp_ternero}
                </td>
                <td className="px-4 py-2">{t.dias_desde_nacimiento ?? "—"}</td>
                <td className="px-4 py-2">
                  {t.ultimo_peso != null ? `${t.ultimo_peso} kg` : "—"}
                </td>
                <td className="px-4 py-2 text-red-400 font-bold">
                  {t.aumento_diario_promedio != null
                    ? `${t.aumento_diario_promedio.toFixed(2)} kg`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Dashboard principal ─────────────────────────────────────
const Dashboard = () => {
  const { authPayload, status, userPayload } = useSelector(
    (state) => state.auth
  );
  const { stateSeccion } = useSelector((state) => state.seccion);
  const { statusSessionUser } = useSelector((state) => state.register);
  const { establecimientoActual } = useSelector((state) => state.auth);

  const { obtenerResumenDashboardHook } = useBussinesMicroservicio();

  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState("dashboard"); // "dashboard" | "app"

  // ── Autenticación ─────────────────────────────────────────
  if (status !== "authenticated" && !authPayload?.user && statusSessionUser === true) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <h1 className="text-4xl font-bold text-red-400">404 | Not Found</h1>
      </div>
    );
  }

  const sinEstablecimiento =
    userPayload?.rol === "admin" &&
    !userPayload?.id_establecimiento &&
    (!userPayload?.userEstablecimientos ||
      userPayload.userEstablecimientos.length === 0);

  if (sinEstablecimiento) {
    return <SetupEstablecimiento />;
  }

  // ── Carga de KPIs ─────────────────────────────────────────
  const cargarResumen = async () => {
    try {
      setLoading(true);
      setError(null);
      let queryParams = "";
      if (userPayload?.rol === "admin" && establecimientoActual) {
        queryParams = `id_establecimiento=${establecimientoActual}`;
      }
      const res = await obtenerResumenDashboardHook(queryParams);
      if (res?.status === 200 || res?.data) {
        setResumen(res.data);
      } else {
        setError("No se pudo obtener el resumen.");
      }
    } catch {
      setError("Error de conexión al cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vista === "dashboard") cargarResumen();
  }, [establecimientoActual, vista]);

  // ── Vista de formularios/listados (acceso al sistema completo) ──
  if (vista === "app") {
    return (
      <>
        <div className="fixed top-3 left-3 z-50">
          <button
            onClick={() => setVista("dashboard")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium shadow transition-colors"
          >
            ← Dashboard
          </button>
        </div>
        {stateSeccion === false ? <FormularioPrincipal /> : <Listadoseccion />}
      </>
    );
  }

  // ── Datos para el gráfico ─────────────────────────────────
  const datosGrafico = resumen
    ? [
        { name: "Vivos", cantidad: resumen.vivos, color: "#22c55e" },
        { name: "Muertos", cantidad: resumen.muertos, color: "#ef4444" },
        { name: "Vendidos", cantidad: resumen.vendidos, color: "#3b82f6" },
      ]
    : [];

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-slate-700/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              🐄 TerneData
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Bienvenido,{" "}
              <span className="text-slate-200 font-medium">
                {userPayload?.name || "productor"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={cargarResumen}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "⏳ Actualizando..." : "🔄 Actualizar"}
            </button>
            <button
              onClick={() => setVista("app")}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
            >
              Ir al sistema →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
            ❌ {error}
          </div>
        )}

        {/* KPI Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400" />
            <span className="ml-3 text-slate-400">Cargando KPIs...</span>
          </div>
        ) : resumen ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <KPICard
                titulo="Total terneros"
                valor={resumen.total}
                icono="🐄"
                color="text-white"
              />
              <KPICard
                titulo="Terneros vivos"
                valor={resumen.vivos}
                icono="💚"
                color="text-emerald-400"
                subtitulo={`${resumen.vendidos} vendidos`}
              />
              <KPICard
                titulo="Mortalidad (30d)"
                valor={resumen.mortalidad_ultimos_30d}
                icono="📉"
                color={
                  resumen.mortalidad_ultimos_30d > 0
                    ? "text-red-400"
                    : "text-slate-300"
                }
                alerta={resumen.mortalidad_ultimos_30d > 0}
                subtitulo={`Total histórico: ${resumen.muertos}`}
              />
              <KPICard
                titulo="Ganancia promedio"
                valor={`${resumen.promedio_ganancia_diaria_kg} kg/día`}
                icono="⚖️"
                color={
                  resumen.promedio_ganancia_diaria_kg >= 0.8
                    ? "text-emerald-400"
                    : resumen.promedio_ganancia_diaria_kg >= 0.5
                    ? "text-yellow-400"
                    : "text-red-400"
                }
                alerta={resumen.promedio_ganancia_diaria_kg < 0.5}
              />
              <KPICard
                titulo="Calostrados"
                valor={`${resumen.porcentaje_calostrados}%`}
                icono="🍼"
                color="text-blue-400"
                subtitulo={`${resumen.calostrados} de ${resumen.total}`}
              />
              <KPICard
                titulo="Con bajo crecimiento"
                valor={resumen.total_alertas}
                icono="⚠️"
                color={
                  resumen.total_alertas > 0 ? "text-red-400" : "text-slate-300"
                }
                alerta={resumen.total_alertas > 0}
                subtitulo="< 0.5 kg/día"
              />
            </div>

            {/* Gráfico de barras */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-2">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">
                Estado del rodeo
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={datosGrafico}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      color: "#f1f5f9",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                    {datosGrafico.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla de alertas */}
            <TablaAlertas alertas={resumen.alertas_bajo_crecimiento} />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard;
