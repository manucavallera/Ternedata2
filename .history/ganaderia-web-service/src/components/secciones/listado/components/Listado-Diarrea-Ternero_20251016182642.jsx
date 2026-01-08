import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux"; // ⬅️ NUEVO IMPORT

const ListadoDiarreaTernero = () => {
  const { obtenerDiarreaTerneroHook } = useBussinesMicroservicio();
  const { establecimientoActual, userPayload } = useSelector(
    (state) => state.auth
  ); // ⬅️ NUEVO

  const [diarreasTernero, setDiarreasTerneros] = useState([]);
  const [filtroSeveridad, setFiltroSeveridad] = useState("");
  const [cargando, setCargando] = useState(true);

  // Estados para modal y alertas (mantener igual)
  const [modalEliminar, setModalEliminar] = useState({
    isOpen: false,
    diarrea: null,
  });
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
        console.log(
          "🔍 Admin filtrando diarreas por establecimiento:",
          establecimientoActual
        );
      } else if (userPayload?.rol === "admin" && !establecimientoActual) {
        console.log("🔍 Admin viendo TODAS las diarreas");
      } else {
        console.log("🔍 Usuario no-admin, backend filtra automáticamente");
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
        `http://localhost:3000/diarrea-terneros/delete-diarrea-by-id/${modalEliminar.diarrea.id_diarrea_ternero}`,
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
  }, []);

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
    <div className='flex items-center justify-center min-h-screen bg-gray-100 p-4'>
      <div className='relative flex flex-col w-full max-w-7xl overflow-hidden text-slate-300 bg-slate-800 shadow-lg rounded-xl'>
        {/* HEADER CON FILTROS */}
        <div className='p-6 bg-slate-900 border-b border-slate-700'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div>
              {/* ✅ CORREGIDO: Título con gradiente */}
              <h2 className='text-3xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent'>
                🏥 Registro de Diarreas - Terneros
              </h2>
              <p className='text-slate-400 mt-1'>
                Total de registros: {diarreasTernero.length} | Mostrando:{" "}
                {diarreasFiltradas.length}
              </p>
            </div>

            {/* FILTRO POR SEVERIDAD */}
            <div className='flex items-center gap-3'>
              <label className='text-sm font-medium text-slate-300'>
                Filtrar por severidad:
              </label>
              <select
                value={filtroSeveridad}
                onChange={(e) => setFiltroSeveridad(e.target.value)}
                className='px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              >
                <option value=''>Todas las severidades</option>
                <option value='Leve'>🟢 Leve</option>
                <option value='Moderada'>🟡 Moderada</option>
                <option value='Severa'>🟠 Severa</option>
                <option value='Crítica'>🔴 Crítica</option>
              </select>
              <button
                onClick={cargarDiarreaTerneroList}
                className='px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors'
              >
                🔄 Actualizar
              </button>
            </div>
          </div>

          {/* ✅ NUEVO: Alert */}
          {alert.show && (
            <div
              className={`mt-4 p-4 rounded-lg text-center font-medium ${
                alert.type === "error"
                  ? "bg-red-500 text-white"
                  : "bg-green-500 text-white"
              }`}
            >
              {alert.type === "error" ? "❌" : "✅"} {alert.message}
            </div>
          )}
        </div>

        {/* TABLA RESPONSIVE */}
        <div className='overflow-auto max-h-96'>
          <table className='w-full text-left table-auto min-w-max bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800'>
            <thead className='bg-slate-900 sticky top-0'>
              <tr>
                <th className='px-4 py-3 border-b border-slate-600'>
                  <p className='text-sm font-medium'>📊 Episodio</p>
                </th>
                <th className='px-4 py-3 border-b border-slate-600'>
                  <p className='text-sm font-medium'>📅 Fecha</p>
                </th>
                <th className='px-4 py-3 border-b border-slate-600'>
                  <p className='text-sm font-medium'>⚠️ Severidad</p>
                </th>
                <th className='px-4 py-3 border-b border-slate-600'>
                  <p className='text-sm font-medium'>🐄 Datos del Ternero</p>
                </th>
                <th className='px-4 py-3 border-b border-slate-600'>
                  <p className='text-sm font-medium'>
                    📝 Observaciones Médicas
                  </p>
                </th>
                {/* ✅ NUEVA COLUMNA */}
                <th className='px-4 py-3 border-b border-slate-600'>
                  <p className='text-sm font-medium'>Acciones</p>
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

                    {/* ✅ NUEVA COLUMNA: Acciones */}
                    <td className='px-4 py-3 border-b border-slate-700'>
                      <div className='flex flex-col gap-2'>
                        <button
                          onClick={() => abrirModalEliminar(diarrea)}
                          className='px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors'
                          title='Eliminar registro de diarrea'
                        >
                          🗑️ Eliminar
                        </button>
                        {/* Aquí puedes agregar más botones como Editar */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER CON ESTADÍSTICAS */}
        {diarreasTernero.length > 0 && (
          <div className='p-4 bg-slate-900 border-t border-slate-700'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm'>
              <div>
                <p className='text-slate-400'>Total Episodios</p>
                <p className='text-xl font-bold text-indigo-400'>
                  {diarreasTernero.length}
                </p>
              </div>
              <div>
                <p className='text-slate-400'>Severidad Crítica</p>
                <p className='text-xl font-bold text-red-400'>
                  {
                    diarreasTernero.filter((d) => d.severidad === "Crítica")
                      .length
                  }
                </p>
              </div>
              <div>
                <p className='text-slate-400'>Severidad Severa</p>
                <p className='text-xl font-bold text-orange-400'>
                  {
                    diarreasTernero.filter((d) => d.severidad === "Severa")
                      .length
                  }
                </p>
              </div>
              <div>
                <p className='text-slate-400'>Casos Recurrentes</p>
                <p className='text-xl font-bold text-yellow-400'>
                  {diarreasTernero.filter((d) => d.numero_episodio >= 3).length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NUEVO: Modal de Eliminación */}
        {modalEliminar.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white p-6 rounded-lg shadow-xl w-full max-w-md'>
              <div className='flex items-center gap-3 mb-4'>
                <span className='text-red-600 text-2xl'>⚠️</span>
                <h3 className='text-lg font-bold text-gray-800'>
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
