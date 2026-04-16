import React, { useEffect, useState, useRef } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux";
import businessApi from "@/api/bussines-api";

// ─── Componente: Gauge Circular SVG animado ───
const CircularGauge = ({ value, maxValue = 100, color, label, size = 120 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((animatedValue / maxValue) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const colorMap = {
    green: { stroke: "#22c55e", bg: "rgba(34,197,94,0.15)", text: "text-green-400" },
    yellow: { stroke: "#eab308", bg: "rgba(234,179,8,0.15)", text: "text-yellow-400" },
    orange: { stroke: "#f97316", bg: "rgba(249,115,22,0.15)", text: "text-orange-400" },
    red: { stroke: "#ef4444", bg: "rgba(239,68,68,0.15)", text: "text-red-400" },
  };

  const colors = colorMap[color] || colorMap.green;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 6px ${colors.stroke}66)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl sm:text-3xl font-black ${colors.text}`}>
            {animatedValue}%
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs sm:text-sm font-semibold text-gray-300 tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
};

// ─── Componente: Barra de Progreso animada ───
const AnimatedBar = ({ value, total, color = "blue", label }) => {
  const [width, setWidth] = useState(0);
  const percentage = total > 0 ? (value / total) * 100 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 400);
    return () => clearTimeout(timer);
  }, [percentage]);

  const gradients = {
    blue: "from-blue-500 to-cyan-400",
    yellow: "from-yellow-500 to-amber-400",
    red: "from-red-500 to-rose-400",
    green: "from-green-500 to-emerald-400",
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs sm:text-sm font-medium text-gray-300">{label}</span>
        <span className="text-xs sm:text-sm font-bold text-white">{value}</span>
      </div>
      <div className="w-full h-2 sm:h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradients[color]} rounded-full`}
          style={{
            width: `${width}%`,
            transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 0 8px rgba(255,255,255,0.2)",
          }}
        />
      </div>
    </div>
  );
};

// ─── Componente: Card con animación de entrada ───
const AnimatedCard = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-700 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
};

// ─── Componente: Stat Card con ícono y gradiente ───
const StatCard = ({ icon, label, value, subtitle, gradient, delay }) => (
  <AnimatedCard delay={delay}>
    <div className="relative group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden">
      {/* Fondo decorativo */}
      <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />

      <div className="flex items-start gap-3 sm:gap-4 relative z-10">
        <div className={`flex-shrink-0 w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-400 truncate uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-0.5">
            {value}
          </p>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  </AnimatedCard>
);

// ═══════════════════════════════════════════════════
// ─── COMPONENTE PRINCIPAL: ResumenSalud ───
// ═══════════════════════════════════════════════════
const ResumenSalud = () => {
  const { obtenerResumenSaludHook } = useBussinesMicroservicio();
  const { establecimientoActual, userPayload } = useSelector(
    (state) => state.auth
  );

  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarResumen = async () => {
    try {
      setLoading(true);

      let queryParams = "";

      if (userPayload?.rol === "admin" && establecimientoActual) {
        queryParams = `id_establecimiento=${establecimientoActual}`;
      }

      const resultado = await obtenerResumenSaludHook(queryParams);

      if (resultado?.status === 200) {
        setResumen(resultado.data);

        const idEst = userPayload?.id_establecimiento;
        if (idEst && resultado.data) {
          businessApi.post("/alerts/check", {
            establecimientoId: idEst,
            mortalidad: resultado.data.porcentajeMortalidad,
            morbilidad: resultado.data.porcentajeMorbilidad,
          }).catch(() => {});
        }
      } else {
        setError("Error al cargar el resumen de salud");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarResumen();
  }, [establecimientoActual]);

  // Función para obtener color según el porcentaje
  const getColorPorcentaje = (valor, tipo) => {
    if (tipo === "mortalidad") {
      if (valor === 0) return "green";
      if (valor <= 5) return "yellow";
      if (valor <= 10) return "orange";
      return "red";
    }
    if (tipo === "morbilidad") {
      if (valor <= 10) return "green";
      if (valor <= 20) return "yellow";
      if (valor <= 40) return "orange";
      return "red";
    }
    return "green";
  };

  // Función para obtener etiqueta de estado
  const getEstadoLabel = (valor, tipo) => {
    if (tipo === "mortalidad") {
      if (valor === 0) return "Excelente";
      if (valor <= 5) return "Aceptable";
      if (valor <= 10) return "Atención";
      return "Crítico";
    }
    if (tipo === "morbilidad") {
      if (valor <= 10) return "Excelente";
      if (valor <= 20) return "Aceptable";
      if (valor <= 40) return "Atención";
      return "Crítico";
    }
    return "";
  };

  const getColorSeveridadBadge = (severidad) => {
    switch (severidad) {
      case "moderada":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "critica":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "severa":
        return "bg-red-600/20 text-red-200 border-red-600/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  // ─── Estado: Cargando ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-green-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-400 animate-spin" />
          </div>
          <p className="text-gray-400 text-sm sm:text-base font-medium animate-pulse">
            Cargando resumen de salud...
          </p>
        </div>
      </div>
    );
  }

  // ─── Estado: Error ───
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-red-400 text-base sm:text-lg font-semibold mb-4">{error}</p>
          <button
            onClick={cargarResumen}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!resumen) return null;

  const mortalidadColor = getColorPorcentaje(resumen.porcentajeMortalidad, "mortalidad");
  const morbilidadColor = getColorPorcentaje(resumen.porcentajeMorbilidad, "morbilidad");
  const porcentajeSanos = resumen.totalTerneros > 0
    ? ((resumen.ternerosCompletamenteSanos / resumen.totalTerneros) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      {/* Decoración de fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">

        {/* ═══ ENCABEZADO ═══ */}
        <AnimatedCard delay={0}>
          <div className="mb-6 sm:mb-8 md:mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                    <span className="text-xl sm:text-2xl">🏥</span>
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                      Resumen de Salud
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                      Métricas consolidadas del rodeo
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={cargarResumen}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white/5 backdrop-blur border border-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>
        </AnimatedCard>

        {/* ═══ MÉTRICAS PRINCIPALES ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 sm:mb-8">
          <StatCard
            icon="🐄"
            label="Total"
            value={resumen.totalTerneros}
            subtitle={`${resumen.ternerosVivos} vivos`}
            gradient="from-blue-500 to-cyan-500"
            delay={100}
          />
          <StatCard
            icon="💀"
            label="Muertos"
            value={resumen.ternerosMuertos}
            subtitle={`${resumen.porcentajeMortalidad}% mortalidad`}
            gradient="from-red-500 to-rose-500"
            delay={200}
          />
          <StatCard
            icon="💊"
            label="Tratamientos"
            value={resumen.tratamientosTotal}
            subtitle={`${resumen.ternerosConTratamientos} terneros`}
            gradient="from-purple-500 to-violet-500"
            delay={300}
          />
          <StatCard
            icon="✅"
            label="Sanos"
            value={resumen.ternerosCompletamenteSanos}
            subtitle={`${porcentajeSanos}% del total`}
            gradient="from-green-500 to-emerald-500"
            delay={400}
          />
        </div>

        {/* ═══ GAUGES DE MORTALIDAD Y MORBILIDAD ═══ */}
        <AnimatedCard delay={500}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-sm shadow-md">📊</span>
              Indicadores Clave
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 items-center">
              {/* Gauge Mortalidad */}
              <div className="flex flex-col items-center">
                <CircularGauge
                  value={resumen.porcentajeMortalidad}
                  color={mortalidadColor}
                  label="Mortalidad"
                  size={140}
                />
                <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  mortalidadColor === "green" ? "bg-green-500/20 text-green-300" :
                  mortalidadColor === "yellow" ? "bg-yellow-500/20 text-yellow-300" :
                  mortalidadColor === "orange" ? "bg-orange-500/20 text-orange-300" :
                  "bg-red-500/20 text-red-300"
                }`}>
                  {getEstadoLabel(resumen.porcentajeMortalidad, "mortalidad")}
                </span>
              </div>

              {/* Resumen central */}
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="text-center">
                  <p className="text-4xl sm:text-5xl font-black text-white">{resumen.ternerosVivos}</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1 uppercase tracking-wider font-medium">Terneros Vivos</p>
                </div>
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-green-400">{porcentajeSanos}%</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1 uppercase tracking-wider font-medium">Completamente Sanos</p>
                </div>
              </div>

              {/* Gauge Morbilidad */}
              <div className="flex flex-col items-center">
                <CircularGauge
                  value={resumen.porcentajeMorbilidad}
                  color={morbilidadColor}
                  label="Morbilidad"
                  size={140}
                />
                <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  morbilidadColor === "green" ? "bg-green-500/20 text-green-300" :
                  morbilidadColor === "yellow" ? "bg-yellow-500/20 text-yellow-300" :
                  morbilidadColor === "orange" ? "bg-orange-500/20 text-orange-300" :
                  "bg-red-500/20 text-red-300"
                }`}>
                  {getEstadoLabel(resumen.porcentajeMorbilidad, "morbilidad")}
                </span>
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* ═══ TRATAMIENTOS Y DIARREAS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Tratamientos */}
          <AnimatedCard delay={600}>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden h-full">
              <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-transparent">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-sm shadow-md">💊</span>
                  Tratamientos
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                {/* Stats rápidos */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4 text-center border border-white/5">
                    <p className="text-2xl sm:text-3xl font-black text-blue-400">{resumen.ternerosConTratamientos}</p>
                    <p className="text-xs text-gray-400 mt-1">Terneros tratados</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4 text-center border border-white/5">
                    <p className="text-2xl sm:text-3xl font-black text-cyan-400">{resumen.tratamientosTotal}</p>
                    <p className="text-xs text-gray-400 mt-1">Total tratamientos</p>
                  </div>
                </div>

                {/* Desglose por tipo */}
                <h4 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  Por tipo de enfermedad
                </h4>
                <div className="space-y-3">
                  {resumen.desgloseTratamientos.map((item, index) => (
                    <AnimatedBar
                      key={index}
                      value={item.cantidad}
                      total={resumen.tratamientosTotal}
                      color="blue"
                      label={item.tipo_enfermedad}
                    />
                  ))}
                  {resumen.desgloseTratamientos.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">Sin tratamientos registrados</p>
                  )}
                </div>
              </div>
            </div>
          </AnimatedCard>

          {/* Diarreas */}
          <AnimatedCard delay={700}>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden h-full">
              <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-yellow-500/10 to-transparent">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center text-sm shadow-md">🤧</span>
                  Diarreas
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                {/* Stats rápidos */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4 text-center border border-white/5">
                    <p className="text-2xl sm:text-3xl font-black text-yellow-400">{resumen.ternerosConDiarreas}</p>
                    <p className="text-xs text-gray-400 mt-1">Terneros afectados</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4 text-center border border-white/5">
                    <p className="text-2xl sm:text-3xl font-black text-amber-400">{resumen.episodiosDiarrea}</p>
                    <p className="text-xs text-gray-400 mt-1">Total episodios</p>
                  </div>
                </div>

                {/* Desglose por severidad */}
                <h4 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  Por severidad
                </h4>
                <div className="space-y-2 sm:space-y-3">
                  {[
                    { key: "moderada", label: "Moderada", icon: "🟡" },
                    { key: "critica", label: "Crítica", icon: "🟠" },
                    { key: "severa", label: "Severa", icon: "🔴" },
                  ].map((sev) => (
                    <div
                      key={sev.key}
                      className="flex justify-between items-center p-2.5 sm:p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-2">
                        {sev.icon} {sev.label}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getColorSeveridadBadge(sev.key)}`}
                      >
                        {resumen.desgloseDiarreas[sev.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* ═══ ANÁLISIS CRUZADO ═══ */}
        <AnimatedCard delay={800}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-transparent">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center text-sm shadow-md">📈</span>
                Análisis Cruzado
              </h3>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {/* Ambos problemas */}
                <div className="group relative bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 rounded-xl p-4 sm:p-5 text-center hover:border-red-500/40 transition-all hover:-translate-y-0.5">
                  <div className="w-12 h-12 mx-auto mb-3 bg-red-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🚨</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-red-400">{resumen.ternerosConAmbosProblemas}</p>
                  <p className="text-xs sm:text-sm font-semibold text-red-300 mt-2">Ambos problemas</p>
                  <p className="text-xs text-red-400/70 mt-1">Tratamientos + Diarreas</p>
                </div>

                {/* Un solo problema */}
                <div className="group relative bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-xl p-4 sm:p-5 text-center hover:border-yellow-500/40 transition-all hover:-translate-y-0.5">
                  <div className="w-12 h-12 mx-auto mb-3 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-yellow-400">
                    {resumen.ternerosConSoloTratamientos + resumen.ternerosConSoloDiarreas}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-yellow-300 mt-2">Un solo problema</p>
                  <p className="text-xs text-yellow-400/70 mt-1">Tratamientos o Diarreas</p>
                </div>

                {/* Completamente sanos */}
                <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-4 sm:p-5 text-center hover:border-green-500/40 transition-all hover:-translate-y-0.5">
                  <div className="w-12 h-12 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💚</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-green-400">{resumen.ternerosCompletamenteSanos}</p>
                  <p className="text-xs sm:text-sm font-semibold text-green-300 mt-2">Completamente sanos</p>
                  <p className="text-xs text-green-400/70 mt-1">Sin problemas registrados</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedCard>

      </div>
    </div>
  );
};

export default ResumenSalud;
