import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux"; // ⬅️ NUEVO IMPORT

const ListadoTratamiento = () => {
  // ✅ DESPUÉS
  const { obtenerTratamientoHook, obtenerTerneroHook } =
    useBussinesMicroservicio();
  const { establecimientoActual, userPayload } = useSelector(
    (state) => state.auth
  ); // ⬅️ NUEVO

  const [tratamientos, setTratamientos] = useState([]);
  const [filtros, setFiltros] = useState({
    tipo_enfermedad: "",
    turno: "",
  });
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    por_tipo: {},
    por_turno: {},
  });

  // Estados para modal y alertas (mantener igual)
  const [modalEliminar, setModalEliminar] = useState({
    isOpen: false,
    tratamiento: null,
  });
  const [modalEditar, setModalEditar] = useState({
    isOpen: false,
    tratamiento: null,
  });
  const [loadingEditar, setLoadingEditar] = useState(false);
  const [terneros, setTerneros] = useState([]); // Para el selector de terneros
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  // Funciones showAlert, abrirModalEliminar, cerrarModal, eliminarTratamiento (mantener igual)
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
  };

  const abrirModalEliminar = (tratamiento) => {
    setModalEliminar({
      isOpen: true,
      tratamiento: tratamiento,
    });
  };

  const cerrarModal = () => {
    setModalEliminar({ isOpen: false, tratamiento: null });
  };

  const eliminarTratamiento = async () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      showAlert("No hay sesión activa. Por favor, inicia sesión.", "error");
      return;
    }

    try {
      console.log(
        "🗑️ Eliminando tratamiento:",
        modalEliminar.tratamiento.id_tratamiento
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tratamientos/delete-tratamiento-by-id/${modalEliminar.tratamiento.id_tratamiento}`,
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
          `✅ Tratamiento "${modalEliminar.tratamiento.nombre}" eliminado correctamente`
        );
        cargarTratamientoList();
        cerrarModal();
      } else if (response.status === 401) {
        showAlert("❌ Sesión expirada. Inicia sesión nuevamente.", "error");
      } else if (response.status === 404) {
        showAlert("❌ Tratamiento no encontrado.", "error");
      } else {
        showAlert(
          `❌ Error al eliminar tratamiento (${response.status})`,
          "error"
        );
      }
    } catch (error) {
      console.error("🚨 Error al eliminar:", error);
      showAlert("❌ Error de conexión al eliminar", "error");
    }
  };

  // 🆕 AGREGAR ESTAS FUNCIONES:
  const abrirModalEditar = async (tratamiento) => {
    setModalEditar({
      isOpen: true,
      tratamiento: {
        ...tratamiento,
        fecha_tratamiento: tratamiento.fecha_tratamiento.split("T")[0], // Formatear fecha
        id_ternero: tratamiento.ternero?.id_ternero || "",
      },
    });

    // ✅ CORRECCIÓN: Usar el hook ya declarado al inicio del componente
    // Cargar terneros del establecimiento del tratamiento
    if (tratamiento.id_establecimiento) {
      try {
        const queryParams = `id_establecimiento=${tratamiento.id_establecimiento}`;
        const response = await obtenerTerneroHook(queryParams); // ✅ Usar el hook ya existente
        setTerneros(response?.data || []);
      } catch (error) {
        console.error("Error cargando terneros:", error);
        setTerneros([]);
      }
    }
  };

  const cerrarModalEditar = () => {
    setModalEditar({ isOpen: false, tratamiento: null });
    setTerneros([]);
  };

  const handleCambioEditar = (campo, valor) => {
    setModalEditar((prev) => ({
      ...prev,
      tratamiento: {
        ...prev.tratamiento,
        [campo]: valor,
      },
    }));
  };

  const guardarEdicion = async () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      showAlert("No hay sesión activa. Por favor, inicia sesión.", "error");
      return;
    }

    setLoadingEditar(true);

    try {
      const tratamientoActualizado = {
        nombre: modalEditar.tratamiento.nombre,
        descripcion: modalEditar.tratamiento.descripcion,
        tipo_enfermedad: modalEditar.tratamiento.tipo_enfermedad,
        turno: modalEditar.tratamiento.turno,
        fecha_tratamiento: modalEditar.tratamiento.fecha_tratamiento,
      };

      // Agregar id_ternero si existe y no está vacío
      if (
        modalEditar.tratamiento.id_ternero &&
        modalEditar.tratamiento.id_ternero !== ""
      ) {
        tratamientoActualizado.id_ternero = parseInt(
          modalEditar.tratamiento.id_ternero
        );
      }

      console.log("📤 Actualizando tratamiento:", tratamientoActualizado);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tratamientos/patch-tratamiento-by-id/${modalEditar.tratamiento.id_tratamiento}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(tratamientoActualizado),
        }
      );

      if (response.ok) {
        showAlert(
          `✅ Tratamiento "${modalEditar.tratamiento.nombre}" actualizado correctamente`
        );
        cargarTratamientoList();
        cerrarModalEditar();
      } else if (response.status === 401) {
        showAlert("❌ Sesión expirada. Inicia sesión nuevamente.", "error");
      } else if (response.status === 404) {
        showAlert("❌ Tratamiento no encontrado.", "error");
      } else {
        const errorData = await response.json();
        showAlert(
          `❌ Error al actualizar: ${errorData.message || "Error desconocido"}`,
          "error"
        );
      }
    } catch (error) {
      console.error("🚨 Error al actualizar:", error);
      showAlert("❌ Error de conexión al actualizar", "error");
    } finally {
      setLoadingEditar(false);
    }
  };
  const turnosTratamiento = [
    { value: "", label: "🕐 Todos los turnos" },
    { value: "mañana", label: "🌅 Mañana" },
    { value: "tarde", label: "🌆 Tarde" },
  ];

  // Función para obtener el color del badge según el tipo de enfermedad (dinámico)
  const getTipoEnfermedadColor = (tipo) => {
    if (!tipo) return "bg-gray-500 text-gray-900";

    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes("diarrea")) {
      return "bg-yellow-500 text-yellow-900";
    } else if (
      tipoLower.includes("neumonia") ||
      tipoLower.includes("respiratorio")
    ) {
      return "bg-red-500 text-red-900";
    } else if (
      tipoLower.includes("deshidratacion") ||
      tipoLower.includes("deshidratación")
    ) {
      return "bg-blue-500 text-blue-900";
    } else if (
      tipoLower.includes("infeccion") ||
      tipoLower.includes("infección")
    ) {
      return "bg-purple-500 text-purple-900";
    } else if (tipoLower.includes("digestivo")) {
      return "bg-green-500 text-green-900";
    } else if (tipoLower.includes("fiebre")) {
      return "bg-orange-500 text-orange-900";
    } else if (tipoLower.includes("herida") || tipoLower.includes("externo")) {
      return "bg-pink-500 text-pink-900";
    } else if (
      tipoLower.includes("parasito") ||
      tipoLower.includes("parásito")
    ) {
      return "bg-indigo-500 text-indigo-900";
    } else if (
      tipoLower.includes("vitamin") ||
      tipoLower.includes("suplemento")
    ) {
      return "bg-teal-500 text-teal-900";
    } else {
      return "bg-gray-500 text-gray-900";
    }
  };

  // Función para obtener el emoji según el tipo (dinámico)
  const getTipoEnfermedadEmoji = (tipo) => {
    if (!tipo) return "💊";

    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes("diarrea")) {
      return "🦠";
    } else if (
      tipoLower.includes("neumonia") ||
      tipoLower.includes("respiratorio")
    ) {
      return "🫁";
    } else if (
      tipoLower.includes("deshidratacion") ||
      tipoLower.includes("deshidratación")
    ) {
      return "💧";
    } else if (
      tipoLower.includes("infeccion") ||
      tipoLower.includes("infección")
    ) {
      return "🔴";
    } else if (tipoLower.includes("digestivo")) {
      return "🟢";
    } else if (tipoLower.includes("fiebre")) {
      return "🌡️";
    } else if (tipoLower.includes("herida") || tipoLower.includes("externo")) {
      return "🩹";
    } else if (
      tipoLower.includes("parasito") ||
      tipoLower.includes("parásito")
    ) {
      return "🪱";
    } else if (
      tipoLower.includes("vitamin") ||
      tipoLower.includes("suplemento")
    ) {
      return "💎";
    } else {
      return "💊";
    }
  };

  // Función para obtener el color del badge según el turno
  const getTurnoColor = (turno) => {
    switch (turno) {
      case "mañana":
        return "bg-green-500 text-green-900";
      case "tarde":
        return "bg-orange-500 text-orange-900";
      default:
        return "bg-gray-500 text-gray-900";
    }
  };

  // Función para obtener el emoji según el turno
  const getTurnoEmoji = (turno) => {
    switch (turno) {
      case "mañana":
        return "🌅";
      case "tarde":
        return "🌆";
      default:
        return "🕐";
    }
  };

  // Función para calcular estadísticas
  const calcularEstadisticas = (listaTratamientos) => {
    const stats = {
      total: listaTratamientos.length,
      por_tipo: {},
      por_turno: {},
    };

    listaTratamientos.forEach((tratamiento) => {
      // Estadísticas por tipo
      const tipo = tratamiento.tipo_enfermedad || "Sin especificar";
      stats.por_tipo[tipo] = (stats.por_tipo[tipo] || 0) + 1;

      // Estadísticas por turno
      const turno = tratamiento.turno;
      stats.por_turno[turno] = (stats.por_turno[turno] || 0) + 1;
    });

    return stats;
  };

  // Función para cargar tratamientos con filtros
  const cargarTratamientoList = async () => {
    setLoading(true);
    try {
      // Construir query parameters
      const queryParams = new URLSearchParams();

      // ⬅️ NUEVO: Agregar filtro de establecimiento para Admin
      if (userPayload?.rol === "admin" && establecimientoActual) {
        queryParams.append("id_establecimiento", establecimientoActual);
        console.log(
          "🔍 Admin filtrando tratamientos por establecimiento:",
          establecimientoActual
        );
      } else if (userPayload?.rol === "admin" && !establecimientoActual) {
        console.log("🔍 Admin viendo TODOS los tratamientos");
      } else {
        console.log("🔍 Usuario no-admin, backend filtra automáticamente");
      }

      // Filtros adicionales (tipo_enfermedad y turno)
      if (filtros.tipo_enfermedad) {
        queryParams.append("tipo_enfermedad", filtros.tipo_enfermedad);
      }
      if (filtros.turno) {
        queryParams.append("turno", filtros.turno);
      }

      const resTratamiento = await obtenerTratamientoHook(
        queryParams.toString()
      );

      const tratamientosData = resTratamiento?.data || [];
      setTratamientos(tratamientosData);

      // Calcular estadísticas
      setEstadisticas(calcularEstadisticas(tratamientosData));
    } catch (error) {
      console.error("Error al cargar tratamientos:", error);
      setTratamientos([]);
      setEstadisticas({ total: 0, por_tipo: {}, por_turno: {} });
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en los filtros
  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      tipo_enfermedad: "",
      turno: "",
    });
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    try {
      return new Date(fecha).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return fecha;
    }
  };

  useEffect(() => {
    cargarTratamientoList();
  }, [filtros, establecimientoActual]); // ⬅️ NUEVA DEPENDENCIA

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='relative flex flex-col w-full h-full overflow-scroll text-slate-300 bg-slate-800 shadow-lg rounded-xl p-3 sm:p-4 md:p-6'>
        {/* Alert */}
        {alert.show && (
          <div
            className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg text-center font-medium text-sm sm:text-base ${
              alert.type === "error"
                ? "bg-red-500 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {alert.type === "error" ? "❌" : "✅"} {alert.message}
          </div>
        )}

        {/* ✅ CORREGIDO: Agregado div contenedor y corregida clase CSS */}
        <div className='mb-6'>
          <h2 className='text-xl sm:text-2xl md:text-3xl font-boldbg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent'>
            💊 Listado de Tratamientos
          </h2>
          {/* Botón para crear múltiples (opcional) */}
          <div className='text-xs sm:text-sm text-slate-400 mt-1'>
            💡 Tip: Usa el formulario para crear múltiples tratamientos a la vez
          </div>
        </div>

        {/* Panel de Estadísticas */}
        {!loading && estadisticas.total > 0 && (
          <div className='mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
            {/* Total */}
            <div className='bg-indigo-600 p-3 sm:p-4 rounded-lg'>
              <h3 className='text-xs sm:text-sm font-medium text-indigo-200'>
                Total Tratamientos
              </h3>
              <p className='text-lg sm:text-xl md:text-2xl font-bold text-white'>
                {estadisticas.total}
              </p>
            </div>

            {/* Por tipo (mostrar los 3 más comunes) */}
            {Object.entries(estadisticas.por_tipo)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([tipo, cantidad]) => (
                <div
                  key={tipo}
                  className={`p-3 sm:p-4 rounded-lg ${getTipoEnfermedadColor(
                    tipo
                  )
                    .replace("text-", "bg-")
                    .replace("-900", "-600")}`}
                >
                  <h3 className='text-xs sm:text-sm font-medium'>
                    {getTipoEnfermedadEmoji(tipo)}{" "}
                    {tipo.length > 15 ? tipo.substring(0, 15) + "..." : tipo}
                  </h3>
                  <p className='text-lg sm:text-xl md:text-2xl font-bold text-white'>
                    {cantidad}
                  </p>
                </div>
              ))}
          </div>
        )}

        {/* Panel de Filtros */}
        <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-700 rounded-lg'>
          <h3 className='text-base sm:text-lg font-semibold mb-3 text-indigo-300'>
            🔍 Filtros
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'>
            {/* Filtro por Tipo de Enfermedad - AHORA ES INPUT LIBRE */}
            <div>
              <label className='block text-xs sm:text-sm font-medium mb-2'>
                Tipo de Enfermedad
              </label>
              <input
                type='text'
                value={filtros.tipo_enfermedad}
                onChange={(e) =>
                  handleFiltroChange("tipo_enfermedad", e.target.value)
                }
                placeholder='Ej: diarrea, respiratorio, etc...'
                className='w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white focus:ring-2 focus:ring-indigo-500 placeholder-slate-400'
              />
              <p className='text-xs text-slate-400 mt-1'>
                💡 Busca por cualquier palabra (diarrea, respiratorio, etc.)
              </p>
            </div>

            {/* Filtro por Turno */}
            <div>
              <label className='block text-sm font-medium mb-2'>Turno</label>
              <select
                value={filtros.turno}
                onChange={(e) => handleFiltroChange("turno", e.target.value)}
                cclassName='w-full px-2 sm:px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white text-xs sm:text-smborder border-slate-500 rounded-md text-white focus:ring-2 focus:ring-indigo-500'
              >
                {turnosTratamiento.map((turno) => (
                  <option key={turno.value} value={turno.value}>
                    {turno.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Limpiar Filtros */}
            <div className='flex items-end'>
              <button
                onClick={limpiarFiltros}
                cclassName='w-full px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm rounded-md hover:bg-red-700 text-white rounded-md transition-colors'
              >
                🗑️ Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className='mt-3 text-sm text-slate-400'>
            {loading
              ? "⏳ Cargando..."
              : `📊 ${tratamientos.length} tratamiento(s) encontrado(s)`}
            {filtros.tipo_enfermedad || filtros.turno ? (
              <span className='ml-2 text-yellow-400'>
                (filtrado de {estadisticas.total} total)
              </span>
            ) : null}
          </div>
        </div>

        {/* Tabla de Tratamientos - SIN COLUMNA APLICACIONES */}
        <div className='overflow-x-auto'>
          <table className='w-full text-left table-auto min-w-max bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 border-separate border-spacing-0 rounded-lg shadow-2xl'>
            <thead className='bg-slate-900'>
              <tr>
                <th className='px-4 py-2 border-b border-slate-600 bg-slate-700'>
                  <p className='text-sm font-medium leading-none'>ID</p>
                </th>
                <th className='px-4 py-2 border-b border-slate-600 bg-slate-700'>
                  <p className='text-sm font-medium leading-none'>Nombre</p>
                </th>
                <th className='px-4 py-2 border-b border-slate-600 bg-slate-700'>
                  <p className='text-sm font-medium leading-none'>
                    Descripción
                  </p>
                </th>
                <th className='px-4 py-2 border-b border-slate-600 bg-slate-700'>
                  <p className='text-sm font-medium leading-none'>
                    Tipo Enfermedad
                  </p>
                </th>
                <th className='px-4 py-2 border-b border-slate-600 bg-slate-700'>
                  <p className='text-sm font-medium leading-none'>Turno</p>
                </th>
                <th className='px-4 py-2 border-b border-slate-600 bg-slate-700'>
                  <p className='text-sm font-medium leading-none'>Fecha</p>
                </th>
                <th className='px-4 py-2 border-b border-slate-600 bg-slate-700'>
                  <p className='text-sm font-medium leading-none'>🐄 Ternero</p>
                </th>
                <th className='px-4 py-2 border-b border-slate-600 bg-slate-700'>
                  <p className='text-sm font-medium leading-none'>Acciones</p>
                </th>
              </tr>
            </thead>
            <tbody className='text-slate-300'>
              {loading ? (
                <tr>
                  <td colSpan='8' className='px-4 py-8 text-center'>
                    <div className='flex justify-center items-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500'></div>
                      <span className='ml-2'>Cargando tratamientos...</span>
                    </div>
                  </td>
                </tr>
              ) : tratamientos.length === 0 ? (
                <tr>
                  <td
                    colSpan='8'
                    className='px-4 py-8 text-center text-slate-400'
                  >
                    <div className='space-y-2'>
                      <div>
                        📭 No se encontraron tratamientos con los filtros
                        aplicados
                      </div>
                      {(filtros.tipo_enfermedad || filtros.turno) && (
                        <button
                          onClick={limpiarFiltros}
                          className='text-indigo-400 hover:text-indigo-300 underline text-sm'
                        >
                          Limpiar filtros para ver todos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                tratamientos.map((tratamiento, index) => (
                  <tr
                    key={tratamiento.id_tratamiento}
                    className='hover:bg-slate-600 transition-all duration-300'
                  >
                    <td className='px-4 py-2 border-b border-slate-700'>
                      <p className='text-sm font-semibold'>
                        #{tratamiento.id_tratamiento}
                      </p>
                    </td>
                    <td className='px-4 py-2 border-b border-slate-700'>
                      <div>
                        <p className='text-sm font-medium text-indigo-300'>
                          {tratamiento.nombre}
                        </p>
                        {index < 3 && (
                          <span className='text-xs text-green-400'>
                            ✨ Reciente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className='px-4 py-2 border-b border-slate-700'>
                      <p
                        className='text-sm text-slate-300 max-w-xs truncate'
                        title={tratamiento.descripcion}
                      >
                        {tratamiento.descripcion}
                      </p>
                    </td>
                    <td className='px-4 py-2 border-b border-slate-700'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoEnfermedadColor(
                          tratamiento.tipo_enfermedad
                        )}`}
                      >
                        {getTipoEnfermedadEmoji(tratamiento.tipo_enfermedad)}{" "}
                        {tratamiento.tipo_enfermedad || "Sin especificar"}
                      </span>
                    </td>
                    <td className='px-4 py-2 border-b border-slate-700'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getTurnoColor(
                          tratamiento.turno
                        )}`}
                      >
                        {getTurnoEmoji(tratamiento.turno)}{" "}
                        {tratamiento.turno?.charAt(0).toUpperCase() +
                          tratamiento.turno?.slice(1)}
                      </span>
                    </td>
                    <td className='px-4 py-2 border-b border-slate-700'>
                      <p className='text-sm'>
                        📅 {formatearFecha(tratamiento.fecha_tratamiento)}
                      </p>
                    </td>

                    {/* 🆕 AGREGAR ESTA CELDA */}
                    <td className='px-4 py-2 border-b border-slate-700'>
                      {tratamiento.ternero ? (
                        <div className='text-sm'>
                          <p className='font-medium text-green-400'>
                            🐄 RP: {tratamiento.ternero.rp_ternero}
                          </p>
                          <p className='text-xs text-slate-400'>
                            {tratamiento.ternero.nombre_ternero || "Sin nombre"}
                          </p>
                        </div>
                      ) : (
                        <span className='text-xs text-slate-500 italic'>
                          Sin ternero asignado
                        </span>
                      )}
                    </td>

                    {/* 🆕 NUEVA: Columna Acciones */}
                    <td className='px-4 py-2 border-b border-slate-700'>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => abrirModalEditar(tratamiento)}
                          className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors'
                          title='Editar tratamiento'
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => abrirModalEliminar(tratamiento)}
                          className='px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors'
                          title='Eliminar tratamiento'
                        >
                          🗑️ Eliminar
                        </button>
                        {/* Aquí puedes agregar más botones como Editar */}
                      </div>
                    </td>
                    {/* ❌ CELDA APLICACIONES ELIMINADA */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Información adicional */}
        {!loading && tratamientos.length > 0 && (
          <div className='mt-4 p-4 bg-slate-700 rounded-lg'>
            <h3 className='text-sm font-bold text-slate-300 mb-2'>
              📋 Información:
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400'>
              <div>
                <p className='mb-1'>
                  <strong>💊 Tratamientos:</strong> Gestión completa de
                  medicamentos y terapias
                </p>
                <p>
                  <strong>🔍 Filtros:</strong> Busca por tipo de enfermedad con
                  texto libre y turno
                </p>
              </div>
              <div>
                <p className='mb-1'>
                  <strong>📊 Estadísticas:</strong> Resumen visual de los tipos
                  más comunes
                </p>
                <p>
                  <strong>✨ Recientes:</strong> Los primeros 3 tratamientos
                  están marcados como recientes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 NUEVO: Modal de Eliminación */}
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
                  ¿Estás seguro de que quieres eliminar este tratamiento?
                </p>
                <div className='bg-gray-50 p-3 rounded border-l-4 border-red-500'>
                  <p className='font-medium text-gray-800'>
                    {modalEliminar.tratamiento?.nombre}
                  </p>
                  <p className='text-sm text-gray-600'>
                    Tipo: {modalEliminar.tratamiento?.tipo_enfermedad}
                  </p>
                  <p className='text-sm text-gray-600'>
                    Turno: {modalEliminar.tratamiento?.turno}
                  </p>
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
                  onClick={eliminarTratamiento}
                  className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors'
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de Eliminación existente... */}

        {/* 🆕 NUEVO: Modal de Edición */}
        {/* 🆕 MODAL DE EDICIÓN - VERSION MEJORADA CON MEJOR CONTRASTE */}
        {modalEditar.isOpen && modalEditar.tratamiento && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto'>
            <div className='bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl my-8'>
              <div className='flex items-center gap-3 mb-4'>
                <span className='text-blue-600 text-2xl'>✏️</span>
                <h3 className='text-lg font-bold text-gray-800'>
                  Editar Tratamiento
                </h3>
              </div>

              <div className='space-y-4 max-h-[70vh] overflow-y-auto pr-2'>
                {/* Nombre */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Nombre *
                  </label>
                  <input
                    type='text'
                    value={modalEditar.tratamiento.nombre}
                    onChange={(e) =>
                      handleCambioEditar("nombre", e.target.value)
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white'
                    placeholder='Ej: Antibiótico Amoxicilina'
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Descripción *
                  </label>
                  <textarea
                    value={modalEditar.tratamiento.descripcion}
                    onChange={(e) =>
                      handleCambioEditar("descripcion", e.target.value)
                    }
                    rows='3'
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white resize-none'
                    placeholder='Describe el tratamiento en detalle'
                  />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {/* Tipo de Enfermedad */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Tipo de Enfermedad *
                    </label>
                    <input
                      type='text'
                      value={modalEditar.tratamiento.tipo_enfermedad}
                      onChange={(e) =>
                        handleCambioEditar("tipo_enfermedad", e.target.value)
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white'
                      placeholder='Ej: Diarrea bacteriana'
                    />
                  </div>

                  {/* Turno */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Turno *
                    </label>
                    <select
                      value={modalEditar.tratamiento.turno}
                      onChange={(e) =>
                        handleCambioEditar("turno", e.target.value)
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white'
                    >
                      <option value='mañana'>🌅 Mañana</option>
                      <option value='tarde'>🌆 Tarde</option>
                    </select>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {/* Fecha */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Fecha de Tratamiento *
                    </label>
                    <input
                      type='date'
                      value={modalEditar.tratamiento.fecha_tratamiento}
                      onChange={(e) =>
                        handleCambioEditar("fecha_tratamiento", e.target.value)
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white'
                    />
                  </div>

                  {/* Ternero */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      🐄 Ternero (opcional)
                    </label>
                    <select
                      value={modalEditar.tratamiento.id_ternero || ""}
                      onChange={(e) =>
                        handleCambioEditar("id_ternero", e.target.value)
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white'
                    >
                      <option value=''>Sin ternero asignado</option>
                      {terneros.map((ternero) => (
                        <option
                          key={ternero.id_ternero}
                          value={ternero.id_ternero}
                        >
                          RP: {ternero.rp_ternero} -{" "}
                          {ternero.nombre_ternero || "Sin nombre"}
                        </option>
                      ))}
                    </select>
                    {terneros.length === 0 &&
                      modalEditar.tratamiento.id_establecimiento && (
                        <p className='text-xs text-gray-500 mt-1'>
                          ℹ️ No hay terneros disponibles en este establecimiento
                        </p>
                      )}
                  </div>
                </div>

                {/* Información del establecimiento (solo visual) */}
                <div className='bg-blue-50 border border-blue-200 rounded-md p-3'>
                  <p className='text-sm text-blue-800'>
                    <strong>🏢 Establecimiento:</strong>{" "}
                    {modalEditar.tratamiento.establecimiento?.nombre ||
                      "No especificado"}
                  </p>
                  <p className='text-xs text-blue-600 mt-1'>
                    ℹ️ El establecimiento no puede ser modificado
                  </p>
                </div>
              </div>

              <div className='flex gap-3 mt-6 pt-4 border-t border-gray-200'>
                <button
                  onClick={cerrarModalEditar}
                  disabled={loadingEditar}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={guardarEdicion}
                  disabled={loadingEditar}
                  className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                >
                  {loadingEditar ? (
                    <div className='flex items-center justify-center'>
                      <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                      Guardando...
                    </div>
                  ) : (
                    "💾 Guardar Cambios"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListadoTratamiento;
