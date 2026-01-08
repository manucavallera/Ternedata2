import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux"; // ⬅️ NUEVO IMPORT

const ResumenSalud = () => {
  const { obtenerResumenSaludHook } = useBussinesMicroservicio();
  const { establecimientoActual, userPayload } = useSelector(
    (state) => state.auth
  ); // ⬅️ NUEVO

  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ⬅️ FUNCIÓN ACTUALIZADA
  const cargarResumen = async () => {
    try {
      setLoading(true);

      // ⬅️ NUEVA LÓGICA DE FILTRADO
      let queryParams = "";

      // Si es admin y seleccionó un establecimiento, filtrar por ese
      if (userPayload?.rol === "admin" && establecimientoActual) {
        queryParams = `id_establecimiento=${establecimientoActual}`;
        console.log(
          "🔍 Admin filtrando resumen por establecimiento:",
          establecimientoActual
        );
      } else if (userPayload?.rol === "admin" && !establecimientoActual) {
        console.log("🔍 Admin viendo resumen de TODOS los establecimientos");
      } else {
        console.log("🔍 Usuario no-admin, backend filtra automáticamente");
      }

      const resultado = await obtenerResumenSaludHook(queryParams);

      if (resultado?.status === 200) {
        setResumen(resultado.data);
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

  // ⬅️ USEEFFECT ACTUALIZADO
  useEffect(() => {
    cargarResumen();
  }, [establecimientoActual]); // ⬅️ NUEVA DEPENDENCIA

  // Función para obtener color según el porcentaje
  const getColorPorcentaje = (valor, tipo) => {
    if (tipo === "mortalidad") {
      if (valor === 0) return "text-green-400";
      if (valor <= 5) return "text-yellow-400";
      if (valor <= 10) return "text-orange-400";
      return "text-red-400";
    }

    if (tipo === "morbilidad") {
      if (valor <= 10) return "text-green-400";
      if (valor <= 20) return "text-yellow-400";
      if (valor <= 40) return "text-orange-400";
      return "text-red-400";
    }

    return "text-blue-400";
  };

  // Función para obtener color de severidad de diarrea
  const getColorSeveridad = (severidad) => {
    switch (severidad) {
      case "moderada":
        return "bg-yellow-500 text-yellow-900";
      case "critica":
        return "bg-red-500 text-red-900";
      case "severa":
        return "bg-red-600 text-red-100";
      default:
        return "bg-gray-500 text-gray-900";
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100 p-3 sm:p-4'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto'></div>
          <p className='mt-3 sm:mt-4 text-sm sm:text-base text-gray-600'>Cargando resumen de salud...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100 p-3 sm:p-4'>
        <div className='text-center'>
          <p className='text-red-600 text-base sm:text-lg'>{error}</p>
          <button
            onClick={cargarResumen}
            className='mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-indigo-600 text-white text-sm sm:text-base rounded hover:bg-indigo-700'
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!resumen) return null;

  return (
    <div className='min-h-screen bg-gray-100 py-4 sm:py-6 md:py-8'>
      <div className='max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8'>
        {/* Encabezado */}
        <div className='mb-4 sm:mb-6 md:mb-8'>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900'>
            Resumen de Salud del Rodeo
          </h1>
          <p className='mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-gray-600'>
            Métricas consolidadas de mortalidad, morbilidad y tratamientos
          </p>
        </div>

        {/* Métricas Principales */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8'>
          {/* Total Terneros */}
          <div className='bg-white overflow-hidden shadow rounded-lg'>
            <div className='p-3 sm:p-4 md:p-5'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <span className='text-3xl'>🐄</span>
                </div>
                <div className='ml-5 w-0 flex-1'>
                  <dl>
                    <dt className='text-xs sm:text-sm font-medium text-gray-500 truncate'>
                      Total Terneros
                    </dt>
                    <dd className='text-base sm:text-lg font-medium text-gray-900'>
                      {resumen.totalTerneros}
                    </dd>
                    <dd className='text-xs sm:text-sm text-gray-500'>
                      {resumen.ternerosVivos} vivos, {resumen.ternerosMuertos}{" "}
                      muertos
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Mortalidad */}
          <div className='bg-white overflow-hidden shadow rounded-lg'>
            <div className='p-3 sm:p-4 md:p-5'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <span className='text-3xl'>💀</span>
                </div>
                <div className='ml-5 w-0 flex-1'>
                  <dl>
                    <dt className='text-xs sm:text-sm font-medium text-gray-500 truncate'>
                      Mortalidad
                    </dt>
                    <dd
                      className={`text-xl sm:text-2xl font-bold ${getColorPorcentaje(
                        resumen.porcentajeMortalidad,
                        "mortalidad"
                      )}`}
                    >
                      {resumen.porcentajeMortalidad}%
                    </dd>
                    <dd className='text-xs sm:text-sm text-gray-500'>
                      {resumen.ternerosMuertos} de {resumen.totalTerneros}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Morbilidad */}
          <div className='bg-white overflow-hidden shadow rounded-lg'>
            <div className='p-3 sm:p-4 md:p-5'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <span className='text-3xl'>🤒</span>
                </div>
                <div className='ml-5 w-0 flex-1'>
                  <dl>
                    <dt className='text-xs sm:text-sm font-medium text-gray-500 truncate'>
                      Morbilidad
                    </dt>
                    <dd
                      className={`text-xl sm:text-2xl font-bold ${getColorPorcentaje(
                        resumen.porcentajeMorbilidad,
                        "morbilidad"
                      )}`}
                    >
                      {resumen.porcentajeMorbilidad}%
                    </dd>
                    <dd className='text-xs sm:text-sm text-gray-500'>
                      Terneros con problemas de salud
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Terneros Sanos */}
          <div className='bg-white overflow-hidden shadow rounded-lg'>
            <div className='p-3 sm:p-4 md:p-5'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <span className='text-3xl'>✅</span>
                </div>
                <div className='ml-5 w-0 flex-1'>
                  <dl>
                    <dt className='text-xs sm:text-sm font-medium text-gray-500 truncate'>
                      Terneros Sanos
                    </dt>
                    <dd className='text-xl sm:text-2xl font-bold text-green-600'>
                      {resumen.ternerosCompletamenteSanos}
                    </dd>
                    <dd className='text-xs sm:text-sm text-gray-500'>
                      {resumen.totalTerneros > 0
                        ? (
                            (resumen.ternerosCompletamenteSanos /
                              resumen.totalTerneros) *
                            100
                          ).toFixed(1)
                        : 0}
                      % del total
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Detalles */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8'>
          {/* Tratamientos */}
          <div className='bg-white shadow rounded-lg'>
            <div className='px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200'>
              <h3 className='text-base sm:text-lg font-medium text-gray-900 flex items-center'>
                <span className='text-xl sm:text-2xl mr-2'>💊</span>
                Tratamientos
              </h3>
            </div>
            <div className='p-3 sm:p-4 md:p-6'>
              <div className='grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6'>
                <div className='text-center'>
                  <div className='text-lg sm:text-xl md:text-2xl font-bold text-blue-600'>
                    {resumen.ternerosConTratamientos}
                  </div>
                  <div className='text-xs sm:text-sm text-gray-500'>
                    Terneros con tratamientos
                  </div>
                </div>
                <div className='text-center'>
                  <div className='text-lg sm:text-xl md:text-2xl font-bold text-blue-600'>
                    {resumen.tratamientosTotal}
                  </div>
                  <div className='text-xs sm:text-sm text-gray-500'>
                    Total tratamientos
                  </div>
                </div>
              </div>

              {/* Desglose por tipo */}
              <h4 className='text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3'>
                Por tipo de enfermedad:
              </h4>
              <div className='space-y-2'>
                {resumen.desgloseTratamientos.map((item, index) => (
                  <div
                    key={index}
                    className='flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded'
                  >
                    <span className='text-xs sm:text-sm font-medium'>
                      {item.tipo_enfermedad}
                    </span>
                    <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium'>
                      {item.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Diarreas */}
          <div className='bg-white shadow rounded-lg'>
            <div className='px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200'>
              <h3 className='text-base sm:text-lg font-medium text-gray-900 flex items-center'>
                <span className='text-xl sm:text-2xl mr-2'>🤧</span>
                Diarreas
              </h3>
            </div>
            <div className='p-3 sm:p-4 md:p-6'>
              <div className='grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6'>
                <div className='text-center'>
                  <div className='text-lg sm:text-xl md:text-2xl font-bold text-yellow-600'>
                    {resumen.ternerosConDiarreas}
                  </div>
                  <div className='text-xs sm:text-sm text-gray-500'>
                    Terneros con diarreas
                  </div>
                </div>
                <div className='text-center'>
                  <div className='text-lg sm:text-xl md:text-2xl font-bold text-yellow-600'>
                    {resumen.episodiosDiarrea}
                  </div>
                  <div className='text-xs sm:text-sm text-gray-500'>Total episodios</div>
                </div>
              </div>

              {/* Desglose por severidad */}
              <h4 className='text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3'>Por severidad:</h4>
              <div className='space-y-2'>
                <div className='flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded'>
                  <span className='text-xs sm:text-sm font-medium'>Moderada</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getColorSeveridad(
                      "moderada"
                    )}`}
                  >
                    {resumen.desgloseDiarreas.moderada}
                  </span>
                </div>
                <div className='flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded'>
                  <span className='text-xs sm:text-sm font-medium'>Crítica</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getColorSeveridad(
                      "critica"
                    )}`}
                  >
                    {resumen.desgloseDiarreas.critica}
                  </span>
                </div>
                <div className='flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded'>
                  <span className='text-xs sm:text-sm font-medium'>Severa</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getColorSeveridad(
                      "severa"
                    )}`}
                  >
                    {resumen.desgloseDiarreas.severa}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Análisis Cruzado */}
        <div className='mt-4 sm:mt-6 md:mt-8 bg-white shadow rounded-lg'>
          <div className='px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200'>
            <h3 className='text-base sm:text-lg font-medium text-gray-900 flex items-center'>
              <span className='text-xl sm:text-2xl mr-2'>📊</span>
              Análisis Cruzado
            </h3>
          </div>
          <div className='p-3 sm:p-4 md:p-6'>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6'>
              <div className='text-center p-3 sm:p-4 bg-red-50 rounded-lg'>
                <div className='text-xl sm:text-2xl font-bold text-red-600'>
                  {resumen.ternerosConAmbosProblemas}
                </div>
                <div className='text-xs sm:text-sm font-medium text-red-700 mt-1'>
                  Terneros con ambos problemas
                </div>
                <div className='text-xs text-red-600 mt-1'>
                  (Tratamientos + Diarreas)
                </div>
              </div>

              <div className='text-center p-3 sm:p-4 bg-yellow-50 rounded-lg'>
                <div className='text-lg sm:text-xl md:text-2xl font-bold text-yellow-600'>
                  {resumen.ternerosConSoloTratamientos +
                    resumen.ternerosConSoloDiarreas}
                </div>
                <div className='text-xs sm:text-sm font-medium text-yellow-700 mt-1'>
                  Terneros con un solo problema
                </div>
                <div className='text-xs text-yellow-600 mt-1'>
                  (Solo tratamientos O solo diarreas)
                </div>
              </div>

              <div className='text-center p-3 sm:p-4 bg-green-50 rounded-lg'>
                <div className='text-xl sm:text-2xl font-bold text-green-600'>
                  {resumen.ternerosCompletamenteSanos}
                </div>
                <div className='text-xs sm:text-sm font-medium text-green-700 mt-1'>
                  Terneros completamente sanos
                </div>
                <div className='text-xs text-green-600 mt-1'>
                  (Sin problemas registrados)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Actualizar */}
        <div className='mt-4 sm:mt-6 md:mt-8 text-center'>
          <button
            onClick={cargarResumen}
            className='inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          >
            <span className='mr-2'>🔄</span>
            Actualizar Datos
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumenSalud;
