import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux"; // ⬅️ NUEVO IMPORT

const ListadoDiarreaTernero = () => {
  const { obtenerDiarreaTerneroHook, patchDiarreaHook } = useBussinesMicroservicio();
  const { establecimientoActual, userPayload } = useSelector(
    (state) => state.auth
  ); // ⬅️ NUEVO

  const [diarreasTernero, setDiarreasTerneros] = useState([]);
  const [filtroSeveridad, setFiltroSeveridad] = useState("");
  const [cargando, setCargando] = useState(true);

  // Estados para modal y alertas (mantener igual)
  const [modalEliminar, setModalEliminar] = useState({ isOpen: false, diarrea: null });
  const [modalEditar, setModalEditar] = useState({ isOpen: false, diarrea: null });
  const [formEditar, setFormEditar] = useState({ fecha_diarrea_ternero: '', severidad: 'Leve', observaciones: '' });
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
  };

  // ⬅️ FUNCIÓN ACTUALIZADA
  const cargarDiarreaTerneroList = async () => {
    setCargando(true);
    try {
      // ⬅️ NUEVA LÓGICA DE FILTRADO
      let queryParams = "";

      // Si es admin y seleccionó un establecimiento, filtrar por ese
      if (userPayload?.rol === "admin" && establecimientoActual) {
        queryParams = `id_establecimiento=${establecimientoActual}`;
      }

      const resDiarreaTernero = await obtenerDiarreaTerneroHook(queryParams);
      setDiarreasTerneros(resDiarreaTernero?.data || []);
    } catch (error) {
      console.error("Error al cargar diarreas:", error);
      showAlert("Error al cargar diarreas", "error");
    } finally {
      setCargando(false);
    }
  };
  const abrirModalEditar = (diarrea) => {
    setFormEditar({
      fecha_diarrea_ternero: diarrea.fecha_diarrea_ternero || '',
      severidad: diarrea.severidad || 'Leve',
      observaciones: diarrea.observaciones || '',
    });
    setModalEditar({ isOpen: true, diarrea });
  };

  const guardarEdicion = async () => {
    const res = await patchDiarreaHook(modalEditar.diarrea.id_diarrea_ternero, formEditar);
    if (res?.error || (res?.status && res.status >= 400)) {
      showAlert(`❌ Error al editar (${res?.status})`, 'error');
    } else {
      showAlert('✅ Registro de diarrea actualizado');
      setModalEditar({ isOpen: false, diarrea: null });
      cargarDiarreaTerneroList();
    }
  };

  // ✅ NUEVO: Función para abrir modal de eliminar
  const abrirModalEliminar = (diarrea) => {
    setModalEliminar({
      isOpen: true,
      diarrea: diarrea,
    });
  };

  // ✅ NUEVO: Función para cerrar modal
  const cerrarModal = () => {
    setModalEliminar({ isOpen: false, diarrea: null });
  };

  // ✅ NUEVO: Función para eliminar diarrea
  const eliminarDiarrea = async () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      showAlert("No hay sesión activa. Por favor, inicia sesión.", "error");
      return;
    }

    try {
      console.log(
        "🗑️ Eliminando diarrea:",
        modalEliminar.diarrea.id_diarrea_ternero
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/diarrea-terneros/delete-diarrea-by-id/${modalEliminar.diarrea.id_diarrea_ternero}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        showAlert(
          `✅ Episodio #${modalEliminar.diarrea.numero_episodio} eliminado correctamente`
        );
        cargarDiarreaTerneroList(); // Recargar lista
        cerrarModal();
      } else if (response.status === 401) {
        showAlert("❌ Sesión expirada. Inicia sesión nuevamente.", "error");
      } else if (response.status === 404) {
        showAlert("❌ Registro de diarrea no encontrado.", "error");
      } else if (response.status === 400) {
        showAlert(
          "❌ No se puede eliminar. El registro tiene relaciones asociadas.",
          "error"
        );
      } else {
        showAlert(
          `❌ Error al eliminar registro (${response.status})`,
          "error"
        );
      }
    } catch (error) {
      console.error("🚨 Error al eliminar:", error);
      showAlert("❌ Error de conexión al eliminar", "error");
    }
  };

  useEffect(() => {
    cargarDiarreaTerneroList();
  }, [establecimientoActual]); // ⬅️ NUEVA DEPENDENCIA

  // Filtrar por severidad
  const diarreasFiltradas = filtroSeveridad
    ? diarreasTernero.filter((diarrea) => diarrea.severidad === filtroSeveridad)
    : diarreasTernero;

  // Obtener color según severidad
  const getColorSeveridad = (severidad) => {
    switch (severidad) {
      case "Leve":
        return "text-green-400";
      case "Moderada":
        return "text-yellow-400";
      case "Severa":
        return "text-orange-400";
      case "Crítica":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  // Obtener icono según número de episodio
  const getIconoEpisodio = (numeroEpisodio) => {
    if (numeroEpisodio === 1) return "🥇"; // Primer episodio
    if (numeroEpisodio === 2) return "🥈"; // Segundo episodio
    if (numeroEpisodio === 3) return "🥉"; // Tercer episodio
    if (numeroEpisodio >= 4) return "🚨"; // Múltiples episodios - alerta
    return "📊";
  };

  if (cargando) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100'>
        <div className='text-center'>
          <svg
            className='animate-spin h-12 w-12 text-blue-600 mx-auto mb-4'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            ></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            ></path>
          </svg>
          <p className='text-gray-600'>Cargando registros de diarrea...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 p-2 sm:p-4'>
      <div className='relative flex flex-col w-full max-w-7xl overflow-hidden text-slate-300 bg-slate-800 shadow-lg rounded-xl'>
        {/* HEADER CON FILTROS - Responsive */}
        <div className='p-3 sm:p-4 md:p-6 bg-slate-900 border-b border-slate-700'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div>
              {/* ✅ CORREGIDO: Título con gradiente responsive */}
              <h2 className='text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent'>
                🏥 Registro de Diarreas - Terneros
              </h2>
              <p className='text-xs sm:text-sm text-slate-400 mt-1'>
                Total de registros: {diarreasTernero.length} | Mostrando:{" "}
                {diarreasFiltradas.length}
              </p>
            </div>

            {/* FILTRO POR SEVERIDAD - Responsive */}
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
              <label className='text-xs sm:text-sm font-medium text-slate-300'>
                Filtrar por severidad:
              </label>
              <select
                value={filtroSeveridad}
                onChange={(e) => setFiltroSeveridad(e.target.value)}
                className='px-2 sm:px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              >
                <option value=''>Todas las severidades</option>
                <option value='Leve'>🟢 Leve</option>
                <option value='Moderada'>🟡 Moderada</option>
                <option value='Severa'>🟠 Severa</option>
                <option value='Crítica'>🔴 Crítica</option>
              </select>
              <button
                onClick={cargarDiarreaTerneroList}
                className='px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-xs sm:text-sm'
              >
                🔄 Actualizar
              </button>
            </div>
          </div>

          {/* ✅ Alert - Responsive */}
          {alert.show && (
            <div
              className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg text-center font-medium text-sm sm:text-base ${
                alert.type === "error"
                  ? "bg-red-500 text-white"
                  : "bg-green-500 text-white"
              }`}
            >
              {alert.type === "error" ? "❌" : "✅"} {alert.message}
            </div>
          )}
        </div>

        {/* Cards — mobile */}
        <div className='md:hidden grid gap-3 mb-4 p-3'>
          {diarreasFiltradas.length === 0 ? (
            <p className='text-center text-slate-400 py-8 text-sm'>No hay registros de diarrea</p>
          ) : (
            diarreasFiltradas.map((diarrea) => (
              <div key={diarrea.id_diarrea_ternero} className='rounded-xl border border-slate-700 bg-slate-800/80 p-3 shadow'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>{getIconoEpisodio(diarrea.numero_episodio)}</span>
                    <div>
                      <p className='text-sm font-bold text-indigo-300'>Episodio #{diarrea.numero_episodio}</p>
                      <p className='text-xs text-slate-400'>{new Date(diarrea.fecha_diarrea_ternero).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    diarrea.severidad === 'Crítica' ? 'border-red-500 bg-red-900/40 text-red-300' :
                    diarrea.severidad === 'Severa' ? 'border-orange-500 bg-orange-900/40 text-orange-300' :
                    diarrea.severidad === 'Moderada' ? 'border-yellow-500 bg-yellow-900/40 text-yellow-300' :
                    'border-green-500 bg-green-900/40 text-green-300'
                  }`}>
                    {diarrea.severidad}
                  </span>
                </div>
                {diarrea.ternero && (
                  <p className='text-xs text-slate-400 mb-2'>🐄 RP <span className='text-green-400 font-medium'>{diarrea.ternero.rp_ternero}</span></p>
                )}
                {diarrea.observaciones && (
                  <p className='text-xs text-slate-400 mb-3 line-clamp-2'>{diarrea.observaciones}</p>
                )}
                <div className='grid grid-cols-2 gap-2'>
                  <button onClick={() => abrirModalEditar(diarrea)} className='py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs rounded-lg font-medium transition-colors'>
                    ✏️ Editar
                  </button>
                  <button onClick={() => abrirModalEliminar(diarrea)} className='py-2 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg font-medium transition-colors'>
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabla — desktop (md y arriba) */}
        <div className='hidden md:block overflow-x-auto max-h-[600px]'>
          <div className='inline-block min-w-full align-middle'>
            <div className='overflow-hidden'>
              <table className='min-w-full text-left table-auto bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800'>
            <thead className='bg-slate-900 sticky top-0'>
              <tr>
                <th className='px-2 sm:px-3 md:px-4 py-2 sm:py-3 border-b border-slate-600'>
                  <p className='text-xs sm:text-sm font-medium whitespace-nowrap'>📊 Episodio</p>
                </th>
                <th className='px-2 sm:px-3 md:px-4 py-2 sm:py-3 border-b border-slate-600'>
                  <p className='text-xs sm:text-sm font-medium whitespace-nowrap'>📅 Fecha</p>
                </th>
                <th className='px-2 sm:px-3 md:px-4 py-2 sm:py-3 border-b border-slate-600'>
                  <p className='text-xs sm:text-sm font-medium whitespace-nowrap'>⚠️ Severidad</p>
                </th>
                <th className='px-2 sm:px-3 md:px-4 py-2 sm:py-3 border-b border-slate-600'>
                  <p className='text-xs sm:text-sm font-medium whitespace-nowrap'>🐄 Datos del Ternero</p>
                </th>
                <th className='px-2 sm:px-3 md:px-4 py-2 sm:py-3 border-b border-slate-600'>
                  <p className='text-xs sm:text-sm font-medium whitespace-nowrap'>
                    📝 Observaciones Médicas
                  </p>
                </th>
                {/* ✅ NUEVA COLUMNA */}
                <th className='px-2 sm:px-3 md:px-4 py-2 sm:py-3 border-b border-slate-600'>
                  <p className='text-xs sm:text-sm font-medium whitespace-nowrap'>Acciones</p>
                </th>
              </tr>
            </thead>
            <tbody className='text-slate-300'>
              {diarreasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan='6'
                    className='px-4 py-8 text-center text-slate-400'
                  >
                    <div className='flex flex-col items-center'>
                      <p className='text-lg mb-2'>📋 No hay registros</p>
                      <p className='text-sm'>
                        {filtroSeveridad
                          ? `No se encontraron registros con severidad "${filtroSeveridad}"`
                          : "No hay episodios de diarrea registrados"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                diarreasFiltradas.map((diarrea) => (
                  <tr
                    key={diarrea.id_diarrea_ternero}
                    className='hover:bg-slate-600 transition-all duration-300'
                  >
                    {/* COLUMNA EPISODIO */}
                    <td className='px-4 py-3 border-b border-slate-700'>
                      <div className='text-center'>
                        <div className='text-2xl mb-1'>
                          {getIconoEpisodio(diarrea.numero_episodio)}
                        </div>
                        <p className='text-sm font-semibold text-indigo-400'>
                          Episodio #{diarrea.numero_episodio}
                        </p>
                        <p className='text-xs text-slate-400'>
                          ID: {diarrea.id_diarrea_ternero}
                        </p>
                      </div>
                    </td>

                    {/* COLUMNA FECHA */}
                    <td className='px-4 py-3 border-b border-slate-700'>
                      <p className='text-sm font-medium'>
                        {new Date(
                          diarrea.fecha_diarrea_ternero
                        ).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </td>

                    {/* COLUMNA SEVERIDAD */}
                    <td className='px-4 py-3 border-b border-slate-700'>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getColorSeveridad(
                          diarrea.severidad
                        )} bg-slate-700`}
                      >
                        {diarrea.severidad}
                      </span>
                    </td>

                    {/* COLUMNA DATOS DEL TERNERO */}
                    <td className='px-4 py-3 border-b border-slate-700'>
                      <div className='space-y-1 text-sm'>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold text-indigo-400'>
                            RP:
                          </span>
                          <span>{diarrea.ternero?.rp_ternero}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold'>Sexo:</span>
                          <span>{diarrea.ternero?.sexo}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold'>Estado:</span>
                          <span
                            className={`font-semibold ${
                              diarrea.ternero?.estado === "Vivo"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {diarrea.ternero?.estado}
                          </span>
                        </div>
                        <details className='mt-2'>
                          <summary className='cursor-pointer text-xs text-indigo-400 hover:text-indigo-300'>
                            📊 Ver pesos detallados
                          </summary>
                          <div className='mt-1 pl-4 space-y-1 text-xs text-slate-400 border-l border-slate-600'>
                            <p>Al nacer: {diarrea.ternero?.peso_nacer} kg</p>
                            <p>15 días: {diarrea.ternero?.peso_15d} kg</p>
                            <p>30 días: {diarrea.ternero?.peso_30d} kg</p>
                            <p>45 días: {diarrea.ternero?.peso_45d} kg</p>
                            <p>Largado: {diarrea.ternero?.peso_largado} kg</p>
                            <p>Estimativo: {diarrea.ternero?.estimativo} kg</p>
                            <p>
                              Nacimiento: {diarrea.ternero?.fecha_nacimiento}
                            </p>
                          </div>
                        </details>
                      </div>
                    </td>

                    {/* COLUMNA OBSERVACIONES MÉDICAS */}
                    <td className='px-4 py-3 border-b border-slate-700'>
                      {diarrea.observaciones ? (
                        <div className='max-w-xs'>
                          <p className='text-sm text-slate-300 leading-relaxed'>
                            {diarrea.observaciones.length > 100
                              ? `${diarrea.observaciones.substring(0, 100)}...`
                              : diarrea.observaciones}
                          </p>
                          {diarrea.observaciones.length > 100 && (
                            <details className='mt-2'>
                              <summary className='cursor-pointer text-xs text-indigo-400 hover:text-indigo-300'>
                                Ver observación completa
                              </summary>
                              <p className='mt-1 text-xs text-slate-400 leading-relaxed'>
                                {diarrea.observaciones}
                              </p>
                            </details>
                          )}
                        </div>
                      ) : (
                        <p className='text-xs text-slate-500 italic'>
                          Sin observaciones registradas
                        </p>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className='px-4 py-3 border-b border-slate-700'>
                      <div className='flex flex-col gap-2'>
                        <button
                          onClick={() => abrirModalEditar(diarrea)}
                          className='px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors'
                          title='Editar registro de diarrea'
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => abrirModalEliminar(diarrea)}
                          className='px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors'
                          title='Eliminar registro de diarrea'
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </div>
          </div>
        </div>
        </div>{/* fin tabla desktop */}

        {/* FOOTER CON ESTADÍSTICAS - Responsive */}
        {diarreasTernero.length > 0 && (
          <div className='p-3 sm:p-4 bg-slate-900 border-t border-slate-700'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center text-xs sm:text-sm'>
              <div>
                <p className='text-slate-400 text-xs sm:text-sm'>Total Episodios</p>
                <p className='text-lg sm:text-xl font-bold text-indigo-400'>
                  {diarreasTernero.length}
                </p>
              </div>
              <div>
                <p className='text-slate-400 text-xs sm:text-sm'>Severidad Crítica</p>
                <p className='text-lg sm:text-xl font-bold text-red-400'>
                  {
                    diarreasTernero.filter((d) => d.severidad === "Crítica")
                      .length
                  }
                </p>
              </div>
              <div>
                <p className='text-slate-400 text-xs sm:text-sm'>Severidad Severa</p>
                <p className='text-lg sm:text-xl font-bold text-orange-400'>
                  {
                    diarreasTernero.filter((d) => d.severidad === "Severa")
                      .length
                  }
                </p>
              </div>
              <div>
                <p className='text-slate-400 text-xs sm:text-sm'>Casos Recurrentes</p>
                <p className='text-lg sm:text-xl font-bold text-yellow-400'>
                  {diarreasTernero.filter((d) => d.numero_episodio >= 3).length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edición */}
        {modalEditar.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4'>
            <div className='bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-md mx-2 sm:mx-4'>
              <h3 className='text-base sm:text-lg font-bold text-gray-800 mb-4'>✏️ Editar Registro de Diarrea</h3>
              <div className='space-y-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Fecha</label>
                  <input type='date' value={formEditar.fecha_diarrea_ternero}
                    onChange={(e) => setFormEditar({ ...formEditar, fecha_diarrea_ternero: e.target.value })}
                    className='w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Severidad</label>
                  <select value={formEditar.severidad}
                    onChange={(e) => setFormEditar({ ...formEditar, severidad: e.target.value })}
                    className='w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'>
                    <option value='Leve'>Leve</option>
                    <option value='Moderada'>Moderada</option>
                    <option value='Severa'>Severa</option>
                    <option value='Crítica'>Crítica</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Observaciones</label>
                  <textarea value={formEditar.observaciones}
                    onChange={(e) => setFormEditar({ ...formEditar, observaciones: e.target.value })}
                    rows={2}
                    className='w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500' />
                </div>
              </div>
              <div className='flex gap-3 mt-4'>
                <button onClick={() => setModalEditar({ isOpen: false, diarrea: null })}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors text-sm'>
                  Cancelar
                </button>
                <button onClick={guardarEdicion}
                  className='flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition-colors text-sm'>
                  💾 Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Modal de Eliminación - Responsive */}
        {modalEliminar.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4'>
            <div className='bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-md mx-2 sm:mx-4'>
              <div className='flex items-center gap-3 mb-4'>
                <span className='text-red-600 text-xl sm:text-2xl'>⚠️</span>
                <h3 className='text-base sm:text-lg font-bold text-gray-800'>
                  Confirmar Eliminación
                </h3>
              </div>

              <div className='mb-4'>
                <p className='text-gray-600 mb-2'>
                  ¿Estás seguro de que quieres eliminar este registro de
                  diarrea?
                </p>
                <div className='bg-gray-50 p-3 rounded border-l-4 border-red-500'>
                  <p className='font-medium text-gray-800'>
                    🏥 Episodio #{modalEliminar.diarrea?.numero_episodio}
                  </p>
                  <p className='text-sm text-gray-600'>
                    📅 Fecha:{" "}
                    {new Date(
                      modalEliminar.diarrea?.fecha_diarrea_ternero
                    ).toLocaleDateString("es-ES")}
                  </p>
                  <p className='text-sm text-gray-600'>
                    ⚠️ Severidad: {modalEliminar.diarrea?.severidad}
                  </p>
                  <p className='text-sm text-gray-600'>
                    🐄 Ternero RP: {modalEliminar.diarrea?.ternero?.rp_ternero}
                  </p>
                  {modalEliminar.diarrea?.observaciones && (
                    <p className='text-sm text-gray-600 mt-1'>
                      📝 {modalEliminar.diarrea.observaciones.substring(0, 50)}
                      {modalEliminar.diarrea.observaciones.length > 50
                        ? "..."
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              <p className='text-red-600 text-sm mb-6'>
                ⚠️ Esta acción no se puede deshacer.
              </p>

              <div className='flex gap-3'>
                <button
                  onClick={cerrarModal}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarDiarrea}
                  className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors'
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListadoDiarreaTernero;
