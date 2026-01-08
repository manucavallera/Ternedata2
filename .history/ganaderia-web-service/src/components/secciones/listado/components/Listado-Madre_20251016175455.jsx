import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux";
const ListadoMadre = () => {
  const { obtenerMadreHook } = useBussinesMicroservicio();
  const [madres, setMadres] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ NUEVO: Estado para modal de eliminación
  const [modalEliminar, setModalEliminar] = useState({
    isOpen: false,
    madre: null,
  });
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  // ✅ NUEVO: Función para mostrar alertas
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
  };

  const cargarMadresList = async () => {
    try {
      setLoading(true);
      const resMadres = await obtenerMadreHook();
      setMadres(resMadres?.data || []);
    } catch (error) {
      console.error("Error al cargar madres:", error);
      setMadres([]);
      showAlert("Error al cargar madres", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Función para abrir modal de eliminar
  const abrirModalEliminar = (madre) => {
    setModalEliminar({
      isOpen: true,
      madre: madre,
    });
  };

  // ✅ NUEVO: Función para cerrar modal
  const cerrarModal = () => {
    setModalEliminar({ isOpen: false, madre: null });
  };

  // ✅ NUEVO: Función para eliminar madre
  const eliminarMadre = async () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      showAlert("No hay sesión activa. Por favor, inicia sesión.", "error");
      return;
    }

    try {
      console.log("🗑️ Eliminando madre:", modalEliminar.madre.id_madre);

      const response = await fetch(
        `http://localhost:3000/madres/delete-madre-by-id/${modalEliminar.madre.id_madre}`,
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
          `✅ Madre "${modalEliminar.madre.nombre}" eliminada correctamente`
        );
        cargarMadresList(); // Recargar lista
        cerrarModal();
      } else if (response.status === 401) {
        showAlert("❌ Sesión expirada. Inicia sesión nuevamente.", "error");
      } else if (response.status === 404) {
        showAlert("❌ Madre no encontrada.", "error");
      } else if (response.status === 400) {
        showAlert(
          "❌ No se puede eliminar. La madre tiene terneros asociados.",
          "error"
        );
      } else {
        showAlert(`❌ Error al eliminar madre (${response.status})`, "error");
      }
    } catch (error) {
      console.error("🚨 Error al eliminar:", error);
      showAlert("❌ Error de conexión al eliminar", "error");
    }
  };

  useEffect(() => {
    cargarMadresList();
  }, []);

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='relative flex flex-col w-full h-full overflow-scroll text-slate-300 bg-slate-800 shadow-lg rounded-xl p-6'>
        {/* ✅ CORREGIDO: Título con gradiente */}
        <h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent'>
          Listado de Madres
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
          {loading ? "Cargando..." : `${madres.length} madre(s) encontrada(s)`}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-left table-auto min-w-max bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 border-separate border-spacing-0 rounded-lg shadow-2xl'>
            <thead className='bg-slate-900'>
              <tr>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  ID
                </th>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  Datos Básicos
                </th>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  Estado
                </th>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  Terneros (Crías)
                </th>
                <th className='px-4 py-3 border-b border-slate-600 bg-slate-700'>
                  Eventos
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
                  <td colSpan='6' className='px-4 py-8 text-center'>
                    <div className='flex justify-center items-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500'></div>
                      <span className='ml-2'>Cargando madres...</span>
                    </div>
                  </td>
                </tr>
              ) : madres.length === 0 ? (
                <tr>
                  <td
                    colSpan='6'
                    className='px-4 py-8 text-center text-slate-400'
                  >
                    No se encontraron madres
                  </td>
                </tr>
              ) : (
                madres?.map((madre) => (
                  <tr
                    key={madre.id_madre}
                    className='hover:bg-slate-600 transition-all duration-300'
                  >
                    {/* ID */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='text-center'>
                        <span className='px-3 py-1 bg-indigo-500 text-indigo-900 rounded-full text-sm font-bold'>
                          #{madre.id_madre}
                        </span>
                      </div>
                    </td>

                    {/* Datos Básicos */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='space-y-2'>
                        <h3 className='text-lg font-bold text-indigo-300'>
                          {madre.nombre}
                        </h3>
                        <div className='space-y-1'>
                          <p className='text-sm'>
                            <span className='font-medium'>RP:</span>{" "}
                            {madre.rp_madre}
                          </p>
                          <p className='text-sm'>
                            <span className='font-medium'>F. Nacimiento:</span>{" "}
                            {madre.fecha_nacimiento}
                          </p>
                          <p className='text-sm text-slate-400'>
                            {madre.observaciones}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='text-center'>
                        <span
                          className={`px-3 py-2 rounded-full text-sm font-bold ${
                            madre.estado === "Seca"
                              ? "bg-green-500 text-green-900"
                              : "bg-blue-500 text-blue-900"
                          }`}
                        >
                          {madre.estado === "Seca" ? "Seca" : "En Tambo"}
                        </span>
                      </div>
                    </td>

                    {/* Terneros */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='space-y-2'>
                        <h3 className='text-green-400 text-sm font-medium'>
                          Crías: {madre?.terneros?.length || 0}
                        </h3>
                        {madre?.terneros?.length > 0 ? (
                          <div className='space-y-2 max-h-40 overflow-y-auto'>
                            {madre.terneros.map((ternero) => (
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

                                {/* Pesos en grid */}
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

                                {/* Información adicional */}
                                <div className='space-y-1'>
                                  <p className='text-xs'>
                                    <span className='text-yellow-400'>
                                      Ideal:
                                    </span>{" "}
                                    {ternero.peso_ideal ||
                                      ternero.peso_nacer * 2}
                                    kg
                                  </p>
                                  {ternero.dias_desde_nacimiento && (
                                    <p className='text-xs'>
                                      <span className='text-orange-400'>
                                        Edad:
                                      </span>{" "}
                                      {ternero.dias_desde_nacimiento} días
                                    </p>
                                  )}
                                  {ternero.semen && (
                                    <p className='text-xs'>
                                      <span className='text-purple-400'>
                                        Semen:
                                      </span>{" "}
                                      {ternero.semen}
                                    </p>
                                  )}
                                  {ternero.estimativo && (
                                    <p className='text-xs text-cyan-400'>
                                      Pesajes:{" "}
                                      {ternero.estimativo.split("|").length}{" "}
                                      registros
                                    </p>
                                  )}
                                </div>

                                <p className='text-xs text-slate-400 mt-2 truncate'>
                                  {ternero.observaciones}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className='text-xs text-slate-500 italic'>
                            Sin crías registradas
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Eventos */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='space-y-2'>
                        <h3 className='text-purple-400 text-sm font-medium'>
                          Eventos: {madre?.eventos?.length || 0}
                        </h3>
                        {madre?.eventos?.length > 0 ? (
                          <div className='space-y-1 max-h-32 overflow-y-auto'>
                            {madre.eventos.map((evento) => (
                              <div
                                key={evento.id_evento}
                                className='bg-slate-700 p-2 rounded text-xs'
                              >
                                <p className='font-medium text-purple-300'>
                                  {evento.fecha_evento}
                                </p>
                                <p className='text-slate-300 truncate'>
                                  {evento.observacion}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className='text-xs text-slate-500 italic'>
                            Sin eventos registrados
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ✅ NUEVA COLUMNA: Acciones */}
                    <td className='px-4 py-4 border-b border-slate-700'>
                      <div className='flex flex-col gap-2'>
                        <button
                          onClick={() => abrirModalEliminar(madre)}
                          className='px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors'
                          title='Eliminar madre'
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

        {/* Resumen estadístico actualizado */}
        <div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='bg-slate-700 p-4 rounded-lg text-center'>
            <h3 className='text-2xl font-bold text-indigo-400'>
              {madres.length}
            </h3>
            <p className='text-sm text-slate-400'>Total Madres</p>
          </div>
          <div className='bg-slate-700 p-4 rounded-lg text-center'>
            <h3 className='text-2xl font-bold text-green-400'>
              {madres.filter((m) => m.estado === "Seca").length}
            </h3>
            <p className='text-sm text-slate-400'>Madres Secas</p>
          </div>
          <div className='bg-slate-700 p-4 rounded-lg text-center'>
            <h3 className='text-2xl font-bold text-yellow-400'>
              {madres.reduce(
                (total, madre) => total + (madre?.terneros?.length || 0),
                0
              )}
            </h3>
            <p className='text-sm text-slate-400'>Total Crías</p>
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
                  ¿Estás seguro de que quieres eliminar esta madre?
                </p>
                <div className='bg-gray-50 p-3 rounded border-l-4 border-red-500'>
                  <p className='font-medium text-gray-800'>
                    {modalEliminar.madre?.nombre}
                  </p>
                  <p className='text-sm text-gray-600'>
                    RP: {modalEliminar.madre?.rp_madre}
                  </p>
                  <p className='text-sm text-gray-600'>
                    Estado: {modalEliminar.madre?.estado}
                  </p>
                  {modalEliminar.madre?.terneros?.length > 0 && (
                    <p className='text-sm text-orange-600 font-medium'>
                      ⚠️ Tiene {modalEliminar.madre.terneros.length} ternero(s)
                      asociado(s)
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
                  onClick={eliminarMadre}
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

export default ListadoMadre;
