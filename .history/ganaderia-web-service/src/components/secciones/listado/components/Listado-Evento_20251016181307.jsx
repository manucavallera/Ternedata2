import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux"; // ⬅️ NUEVO IMPORT

const ListadoEvento = () => {
  const { obtenerEventoHook } = useBussinesMicroservicio();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ NUEVO: Estado para modal de eliminación
  const [modalEliminar, setModalEliminar] = useState({
    isOpen: false,
    evento: null,
  });
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  // ✅ NUEVO: Función para mostrar alertas
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
  };

  const cargarEventosList = async () => {
    try {
      setLoading(true);
      const resEventos = await obtenerEventoHook();
      setEventos(resEventos?.data || []);
    } catch (error) {
      console.error("Error al cargar eventos:", error);
      setEventos([]);
      showAlert("Error al cargar eventos", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Función para abrir modal de eliminar
  const abrirModalEliminar = (evento) => {
    setModalEliminar({
      isOpen: true,
      evento: evento,
    });
  };

  // ✅ NUEVO: Función para cerrar modal
  const cerrarModal = () => {
    setModalEliminar({ isOpen: false, evento: null });
  };

  // ✅ NUEVO: Función para eliminar evento
  const eliminarEvento = async () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      showAlert("No hay sesión activa. Por favor, inicia sesión.", "error");
      return;
    }

    try {
      console.log("🗑️ Eliminando evento:", modalEliminar.evento.id_evento);

      const response = await fetch(
        `http://localhost:3000/eventos/delete-evento-by-id/${modalEliminar.evento.id_evento}`,
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
          `✅ Evento del ${formatearFecha(
            modalEliminar.evento.fecha_evento
          )} eliminado correctamente`
        );
        cargarEventosList(); // Recargar lista
        cerrarModal();
      } else if (response.status === 401) {
        showAlert("❌ Sesión expirada. Inicia sesión nuevamente.", "error");
      } else if (response.status === 404) {
        showAlert("❌ Evento no encontrado.", "error");
      } else if (response.status === 400) {
        showAlert(
          "❌ No se puede eliminar. El evento tiene relaciones asociadas.",
          "error"
        );
      } else {
        showAlert(`❌ Error al eliminar evento (${response.status})`, "error");
      }
    } catch (error) {
      console.error("🚨 Error al eliminar:", error);
      showAlert("❌ Error de conexión al eliminar", "error");
    }
  };

  useEffect(() => {
    cargarEventosList();
  }, []);

  // Función para formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";
    try {
      return new Date(fecha).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return fecha;
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='relative flex flex-col w-full h-full overflow-scroll text-slate-300 bg-slate-800 shadow-lg rounded-xl p-6'>
        {/* ✅ CORREGIDO: Título con gradiente */}
        <h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent'>
          Listado de Eventos
        </h2>

        {/* ✅ NUEVO: Alert */}
        {alert.show && (
          <div
            className={`mb-4 p-4 rounded-lg text-center font-medium ${
              alert.type === "error"
                ? "bg-red-500 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {alert.type === "error" ? "❌" : "✅"} {alert.message}
          </div>
        )}

        {/* Contador de resultados */}
        <div className='mb-4 text-sm text-slate-400'>
          {loading
            ? "Cargando..."
            : `${eventos.length} evento(s) encontrado(s)`}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-left table-auto min-w-max bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 border-separate border-spacing-0 rounded-lg shadow-2xl'>
            <thead className='bg-slate-900'>
              <tr>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  ID
                </th>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  Información del Evento
                </th>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  Terneros Involucrados
                </th>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  Madres Involucradas
                </th>
                {/* ✅ NUEVA COLUMNA */}
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className='text-slate-300'>
              {loading ? (
                <tr>
                  <td colSpan='5' className='px-4 py-8 text-center'>
                    <div className='flex justify-center items-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500'></div>
                      <span className='ml-2'>Cargando eventos...</span>
                    </div>
                  </td>
                </tr>
              ) : eventos.length === 0 ? (
                <tr>
                  <td
                    colSpan='5'
                    className='px-4 py-8 text-center text-slate-400'
                  >
                    No se encontraron eventos
                  </td>
                </tr>
              ) : (
                eventos.map((evento) => (
                  <tr
                    key={evento.id_evento}
                    className='hover:bg-slate-600 transition-all duration-300'
                  >
                    {/* ID */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='text-center'>
                        <span className='px-3 py-1 bg-purple-500 text-purple-900 rounded-full text-sm font-bold'>
                          #{evento.id_evento}
                        </span>
                      </div>
                    </td>

                    {/* Información del Evento */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='space-y-3'>
                        <div className='bg-slate-700 p-4 rounded-lg'>
                          <div className='flex items-center gap-2 mb-2'>
                            <span className='px-2 py-1 bg-indigo-500 text-indigo-900 rounded text-xs font-medium'>
                              FECHA
                            </span>
                            <span className='text-sm font-bold text-indigo-300'>
                              {formatearFecha(evento.fecha_evento)}
                            </span>
                          </div>

                          <div>
                            <span className='px-2 py-1 bg-yellow-500 text-yellow-900 rounded text-xs font-medium mb-2 inline-block'>
                              DESCRIPCIÓN
                            </span>
                            <p className='text-sm text-slate-300 leading-relaxed'>
                              {evento.observacion || "Sin observaciones"}
                            </p>
                          </div>
                        </div>

                        {/* Resumen estadístico del evento */}
                        <div className='grid grid-cols-2 gap-2'>
                          <div className='bg-green-600 p-2 rounded text-center'>
                            <p className='text-xs font-bold text-green-100'>
                              Terneros
                            </p>
                            <p className='text-lg font-bold text-white'>
                              {evento?.terneros?.length || 0}
                            </p>
                          </div>
                          <div className='bg-blue-600 p-2 rounded text-center'>
                            <p className='text-xs font-bold text-blue-100'>
                              Madres
                            </p>
                            <p className='text-lg font-bold text-white'>
                              {evento?.madres?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Terneros */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='space-y-2'>
                        <h3 className='text-green-400 text-sm font-medium'>
                          Terneros: {evento?.terneros?.length || 0}
                        </h3>
                        {evento?.terneros && evento.terneros.length > 0 ? (
                          <div className='space-y-2 max-h-40 overflow-y-auto'>
                            {evento.terneros.map((ternero) => (
                              <div
                                key={ternero.id_ternero}
                                className='bg-slate-700 p-3 rounded-lg'
                              >
                                <div className='flex justify-between items-center mb-2'>
                                  <span className='text-sm font-medium text-green-300'>
                                    RP: {ternero.rp_ternero}
                                  </span>
                                  <div className='flex gap-1'>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        ternero.sexo === "Macho"
                                          ? "bg-blue-500 text-blue-900"
                                          : "bg-pink-500 text-pink-900"
                                      }`}
                                    >
                                      {ternero.sexo}
                                    </span>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        ternero.estado === "Vivo"
                                          ? "bg-green-500 text-green-900"
                                          : "bg-red-500 text-red-900"
                                      }`}
                                    >
                                      {ternero.estado}
                                    </span>
                                  </div>
                                </div>

                                <div className='grid grid-cols-2 gap-1 text-xs mb-2'>
                                  <span>
                                    Nacer:{" "}
                                    <strong>{ternero.peso_nacer}kg</strong>
                                  </span>
                                  <span>
                                    15d: <strong>{ternero.peso_15d}kg</strong>
                                  </span>
                                  <span>
                                    30d: <strong>{ternero.peso_30d}kg</strong>
                                  </span>
                                  <span>
                                    45d: <strong>{ternero.peso_45d}kg</strong>
                                  </span>
                                </div>

                                <div className='space-y-1'>
                                  <p className='text-xs'>
                                    <span className='text-yellow-400'>
                                      F. Nacimiento:
                                    </span>{" "}
                                    {formatearFecha(ternero.fecha_nacimiento)}
                                  </p>
                                  {ternero.estimativo && (
                                    <p className='text-xs text-cyan-400'>
                                      Pesajes:{" "}
                                      {typeof ternero.estimativo === "string"
                                        ? ternero.estimativo.split("|").length
                                        : ternero.estimativo}{" "}
                                      registros
                                    </p>
                                  )}
                                  <p className='text-xs text-slate-400 truncate'>
                                    {ternero.observaciones}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className='text-xs text-slate-500 italic'>
                            Sin terneros involucrados
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Madres */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='space-y-2'>
                        <h3 className='text-blue-400 text-sm font-medium'>
                          Madres: {evento?.madres?.length || 0}
                        </h3>
                        {evento?.madres && evento.madres.length > 0 ? (
                          <div className='space-y-2 max-h-40 overflow-y-auto'>
                            {evento.madres.map((madre) => (
                              <div
                                key={madre.id_madre}
                                className='bg-slate-700 p-3 rounded-lg'
                              >
                                <div className='flex justify-between items-center mb-2'>
                                  <h4 className='font-medium text-blue-300'>
                                    {madre.nombre}
                                  </h4>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      madre.estado === "Seca"
                                        ? "bg-green-500 text-green-900"
                                        : "bg-blue-500 text-blue-900"
                                    }`}
                                  >
                                    {madre.estado}
                                  </span>
                                </div>

                                <div className='space-y-1'>
                                  <p className='text-xs'>
                                    <span className='font-medium'>RP:</span>{" "}
                                    {madre.rp_madre}
                                  </p>
                                  <p className='text-xs'>
                                    <span className='text-yellow-400'>
                                      F. Nacimiento:
                                    </span>{" "}
                                    {formatearFecha(madre.fecha_nacimiento)}
                                  </p>
                                  <p className='text-xs text-slate-400 truncate'>
                                    {madre.observaciones}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className='text-xs text-slate-500 italic'>
                            Sin madres involucradas
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ✅ NUEVA COLUMNA: Acciones */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='flex flex-col gap-2'>
                        <button
                          onClick={() => abrirModalEliminar(evento)}
                          className='px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors'
                          title='Eliminar evento'
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

        {/* Resumen estadístico */}
        <div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='bg-slate-700 p-4 rounded-lg text-center'>
            <h3 className='text-2xl font-bold text-purple-400'>
              {eventos.length}
            </h3>
            <p className='text-sm text-slate-400'>Total Eventos</p>
          </div>
          <div className='bg-slate-700 p-4 rounded-lg text-center'>
            <h3 className='text-2xl font-bold text-green-400'>
              {eventos.reduce(
                (total, evento) => total + (evento?.terneros?.length || 0),
                0
              )}
            </h3>
            <p className='text-sm text-slate-400'>Terneros Involucrados</p>
          </div>
          <div className='bg-slate-700 p-4 rounded-lg text-center'>
            <h3 className='text-2xl font-bold text-blue-400'>
              {eventos.reduce(
                (total, evento) => total + (evento?.madres?.length || 0),
                0
              )}
            </h3>
            <p className='text-sm text-slate-400'>Madres Involucradas</p>
          </div>
        </div>

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
                  ¿Estás seguro de que quieres eliminar este evento?
                </p>
                <div className='bg-gray-50 p-3 rounded border-l-4 border-red-500'>
                  <p className='font-medium text-gray-800'>
                    📅 Fecha:{" "}
                    {formatearFecha(modalEliminar.evento?.fecha_evento)}
                  </p>
                  <p className='text-sm text-gray-600 mt-1'>
                    📝{" "}
                    {modalEliminar.evento?.observacion || "Sin observaciones"}
                  </p>
                  <div className='mt-2 grid grid-cols-2 gap-2 text-xs'>
                    <span className='text-green-600'>
                      🐄 {modalEliminar.evento?.terneros?.length || 0} terneros
                    </span>
                    <span className='text-blue-600'>
                      👩 {modalEliminar.evento?.madres?.length || 0} madres
                    </span>
                  </div>
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
                  onClick={eliminarEvento}
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

export default ListadoEvento;
