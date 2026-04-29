"use client";

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setVistaApp } from "@/store/seccion";
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
    className={`relative flex flex-col gap-1 p-3 sm:p-4 rounded-xl shadow-lg border ${
      alerta
        ? "border-red-500 bg-red-950/40"
        : "border-slate-700 bg-slate-800/80"
    } backdrop-blur-sm min-w-0`}
  >
    <div className="flex items-center justify-between">
      <span className="text-xl sm:text-2xl">{icono}</span>
      {alerta && (
        <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-red-600 text-white font-semibold animate-pulse">
          Alerta
        </span>
      )}
    </div>
    <p
      className={`text-xl sm:text-2xl lg:text-3xl font-extrabold mt-1 break-words leading-tight ${color}`}
    >
      {valor}
    </p>
    <p className="text-xs sm:text-sm font-medium text-slate-300 leading-tight">
      {titulo}
    </p>
    {subtitulo && (
      <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">
        {subtitulo}
      </p>
    )}
  </div>
);

// ─── Tabla de alertas ────────────────────────────────────────
const TablaAlertas = ({ alertas }) => {
  if (!alertas?.length) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm sm:text-base font-semibold text-red-400 mb-3 flex flex-wrap items-center gap-2">
        <span>⚠️ Terneros con bajo crecimiento (&lt; 0.5 kg/día)</span>
        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
          {alertas.length}
        </span>
      </h3>

      {/* Vista tabla — md y arriba */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-700">
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

      {/* Vista cards — mobile */}
      <div className="md:hidden grid gap-2">
        {alertas.map((t) => (
          <div
            key={t.id_ternero}
            className="rounded-lg border border-slate-700 bg-slate-800 p-3"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-red-300 text-sm">
                RP {t.rp_ternero}
              </span>
              <span className="text-red-400 font-bold text-sm">
                {t.aumento_diario_promedio != null
                  ? `${t.aumento_diario_promedio.toFixed(2)} kg/día`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{t.dias_desde_nacimiento ?? "—"} días</span>
              <span>
                {t.ultimo_peso != null ? `${t.ultimo_peso} kg` : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Dashboard principal ─────────────────────────────────────
const Dashboard = () => {
  const dispatch = useDispatch();
  const { authPayload, status, userPayload } = useSelector(
    (state) => state.auth
  );
  const { stateSeccion, vistaApp } = useSelector((state) => state.seccion);
  const { statusSessionUser } = useSelector((state) => state.register);
  const { establecimientoActual } = useSelector((state) => state.auth);

  const { obtenerResumenDashboardHook } = useBussinesMicroservicio();

  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const vista = vistaApp ? "app" : "dashboard";
  const setVista = (v) => dispatch(setVistaApp(v === "app"));

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
      if (!res?.error && res?.status === 200 && res?.data && typeof res.data.total === "number") {
        setResumen(res.data);
      } else {
        setResumen(null);
        setError(res?.data?.message || "No se pudo obtener el resumen.");
      }
    } catch {
      setResumen(null);
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
        { name: "Vivos", cantidad: resumen.vivos ?? 0, color: "#22c55e" },
        { name: "Muertos", cantidad: resumen.muertos ?? 0, color: "#ef4444" },
        { name: "Vendidos", cantidad: resumen.vendidos ?? 0, color: "#3b82f6" },
      ]
    : [];

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="px-3 sm:px-4 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-slate-700/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              🐄 TerneData
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5 truncate">
              Bienvenido,{" "}
              <span className="text-slate-200 font-medium">
                {userPayload?.name || "productor"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={cargarResumen}
              disabled={loading}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "⏳ Actualizando..." : "🔄 Actualizar"}
            </button>
            <button
              onClick={() => setVista("app")}
              className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors whitespace-nowrap"
            >
              Ir al sistema →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-xs sm:text-sm break-words">
            ❌ {error}
          </div>
        )}

        {/* KPI Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400" />
            <span className="ml-3 text-slate-400 text-sm">Cargando KPIs...</span>
          </div>
        ) : resumen ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <KPICard
                titulo="Total terneros"
                valor={resumen.total ?? 0}
                icono="🐄"
                color="text-white"
              />
              <KPICard
                titulo="Terneros vivos"
                valor={resumen.vivos ?? 0}
                icono="💚"
                color="text-emerald-400"
                subtitulo={`${resumen.vendidos ?? 0} vendidos`}
              />
              <KPICard
                titulo="Mortalidad (30d)"
                valor={resumen.mortalidad_ultimos_30d ?? 0}
                icono="📉"
                color={
                  (resumen.mortalidad_ultimos_30d ?? 0) > 0
                    ? "text-red-400"
                    : "text-slate-300"
                }
                alerta={(resumen.mortalidad_ultimos_30d ?? 0) > 0}
                subtitulo={`Total histórico: ${resumen.muertos ?? 0}`}
              />
              <KPICard
                titulo="Ganancia promedio"
                valor={`${resumen.promedio_ganancia_diaria_kg ?? 0} kg/día`}
                icono="⚖️"
                color={
                  (resumen.promedio_ganancia_diaria_kg ?? 0) >= 0.8
                    ? "text-emerald-400"
                    : (resumen.promedio_ganancia_diaria_kg ?? 0) >= 0.5
                    ? "text-yellow-400"
                    : "text-red-400"
                }
                alerta={(resumen.promedio_ganancia_diaria_kg ?? 0) < 0.5}
              />
              <KPICard
                titulo="Calostrados"
                valor={`${resumen.porcentaje_calostrados ?? 0}%`}
                icono="🍼"
                color="text-blue-400"
                subtitulo={`${resumen.calostrados ?? 0} de ${resumen.total ?? 0}`}
              />
              <KPICard
                titulo="Con bajo crecimiento"
                valor={resumen.total_alertas ?? 0}
                icono="⚠️"
                color={
                  (resumen.total_alertas ?? 0) > 0 ? "text-red-400" : "text-slate-300"
                }
                alerta={(resumen.total_alertas ?? 0) > 0}
                subtitulo="< 0.5 kg/día"
              />
            </div>

            {/* Gráfico de barras */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 sm:p-4 mb-2">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 sm:mb-4">
                Estado del rodeo
              </h2>
              <ResponsiveContainer width="100%" height={200}>
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
