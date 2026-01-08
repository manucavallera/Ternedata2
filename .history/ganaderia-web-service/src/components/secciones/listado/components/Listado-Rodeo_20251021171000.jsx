"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUserData, setAuthPayload, setStatus } from "@/store/auth"; // ✅ AGREGAR ESTE IMPORT
import { useBussinesMicroservicio } from "@/hooks/bussines";

const ListadoRodeo = () => {
  const dispatch = useDispatch(); // ✅ Agregar dispatch
  const { userPayload, establecimientoActual } = useSelector(
    (state) => state.auth
  );

  // ✅ AGREGAR: Cargar desde localStorage
  useLayoutEffect(() => {
    const userSelected = localStorage.getItem("userSelected");
    const token = localStorage.getItem("token");

    if (userSelected && token) {
      try {
        const userData = JSON.parse(userSelected);
        dispatch(setUserData(userData));
        dispatch(setAuthPayload(token));
        dispatch(setStatus("authenticated"));
      } catch (error) {
        console.error("❌ Error:", error);
      }
    }
  }, [dispatch]);
  const {
    obtenerRodeosHook,
    crearRodeoHook,
    actualizarRodeoHook,
    toggleEstadoRodeoHook,
    obtenerEstadisticasRodeoHook,
    obtenerEstablecimientosHook,
  } = useBussinesMicroservicio();

  const [rodeos, setRodeos] = useState([]);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("crear"); // 'crear' o 'editar'
  const [selectedRodeo, setSelectedRodeo] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo: "cria",
    id_establecimiento: "",
    estado: "activo",
  });

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
  };

  // ========== CARGAR DATOS ==========
  const cargarRodeos = async () => {
    setLoading(true);
    try {
      let queryParams = "";

      if (userPayload?.rol === "admin" && establecimientoActual) {
        queryParams = `id_establecimiento=${establecimientoActual}`;
      }

      const response = await obtenerRodeosHook(queryParams);

      if (response?.status === 200) {
        setRodeos(response.data);
        console.log("🐄 Rodeos cargados:", response.data);
      }
    } catch (error) {
      console.error("Error al cargar rodeos:", error);
      showAlert("Error al cargar rodeos", "error");
    } finally {
      setLoading(false);
    }
  };

  const cargarEstablecimientos = async () => {
    try {
      const response = await obtenerEstablecimientosHook();
      if (response?.status === 200) {
        setEstablecimientos(response.data.filter((e) => e.estado === "activo"));
      }
    } catch (error) {
      console.error("Error al cargar establecimientos:", error);
    }
  };

  useEffect(() => {
    cargarRodeos();
    cargarEstablecimientos();
  }, [establecimientoActual]);

  // ========== MODAL CREAR/EDITAR ==========
  const abrirModalCrear = () => {
    setModalMode("crear");
    setFormData({
      nombre: "",
      descripcion: "",
      tipo: "cria",
      // ✅ CORRECCIÓN: Usar el establecimiento correcto
      id_establecimiento:
        userPayload?.rol === "admin"
          ? establecimientoActual || ""
          : userPayload?.id_establecimiento || "",
      estado: "activo",
    });
    setShowModal(true);
  };

  const abrirModalEditar = (rodeo) => {
    setModalMode("editar");
    setSelectedRodeo(rodeo);
    setFormData({
      nombre: rodeo.nombre,
      descripcion: rodeo.descripcion || "",
      tipo: rodeo.tipo || "cria",
      id_establecimiento: rodeo.id_establecimiento,
      estado: rodeo.estado,
    });
    setShowModal(true);
  };

  const guardarRodeo = async (e) => {
    e.preventDefault();

    if (!formData.nombre) {
      showAlert("El nombre es obligatorio", "error");
      return;
    }

    // ✅ CORRECCIÓN: Determinar id_establecimiento
    const idEstablecimiento =
      userPayload?.rol === "admin"
        ? formData.id_establecimiento
        : userPayload?.id_establecimiento;

    if (!idEstablecimiento) {
      showAlert("Debe seleccionar un establecimiento", "error");
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        id_establecimiento: parseInt(idEstablecimiento, 10),
      };

      if (modalMode === "crear") {
        await crearRodeoHook(dataToSend);
        showAlert("Rodeo creado correctamente", "success");
      } else {
        await actualizarRodeoHook(selectedRodeo.id_rodeo, dataToSend);
        showAlert("Rodeo actualizado correctamente", "success");
      }

      setShowModal(false);
      cargarRodeos();
    } catch (error) {
      console.error("Error al guardar rodeo:", error);
      showAlert("Error al guardar rodeo", "error");
    }
  };

  // ========== TOGGLE ESTADO ==========
  const toggleEstado = async (id) => {
    if (!window.confirm("¿Estás seguro de cambiar el estado de este rodeo?"))
      return;

    try {
      await toggleEstadoRodeoHook(id);
      showAlert("Estado actualizado correctamente", "success");
      cargarRodeos();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      showAlert("Error al cambiar estado", "error");
    }
  };

  // ========== VER ESTADÍSTICAS ==========
  const verEstadisticas = async (rodeo) => {
    try {
      const response = await obtenerEstadisticasRodeoHook(rodeo.id_rodeo);
      if (response?.status === 200) {
        setStatsData(response.data);
        setShowStatsModal(true);
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
      showAlert("Error al cargar estadísticas", "error");
    }
  };

  // ========== UTILIDADES ==========
  const getTipoColor = (tipo) => {
    const colors = {
      cria: "bg-green-100 text-green-800",
      destete: "bg-blue-100 text-blue-800",
      engorde: "bg-orange-100 text-orange-800",
      reproduccion: "bg-purple-100 text-purple-800",
      otro: "bg-gray-100 text-gray-800",
    };
    return colors[tipo] || "bg-gray-100 text-gray-800";
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      cria: "🍼",
      destete: "🐄",
      engorde: "🥩",
      reproduccion: "💕",
      otro: "📋",
    };
    return icons[tipo] || "📋";
  };

  const getEstadoColor = (estado) => {
    return estado === "activo"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getNombreEstablecimiento = (id) => {
    const est = establecimientos.find((e) => e.id_establecimiento === id);
    return est ? est.nombre : `ID: ${id}`;
  };

  return (
    <div className='p-6'>
      {/* Alerta */}
      {alert.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            alert.type === "success" ? "bg-green-500" : "bg-red-500"
          } text-white animate-fade-in`}
        >
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div className='mb-6'>
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-3xl font-bold text-gray-800'>
              🐄 Gestión de Rodeos
            </h1>
            <p className='text-gray-600 mt-1'>
              Administra los rodeos de tu establecimiento
            </p>
          </div>
          {(userPayload?.rol === "admin" ||
            userPayload?.rol === "veterinario") && (
            <button
              onClick={abrirModalCrear}
              className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md'
            >
              <span>➕</span>
              Crear Rodeo
            </button>
          )}
        </div>
      </div>

      {/* Listado de Rodeos */}
      {loading ? (
        <div className='text-center py-12'>
          <div className='inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent'></div>
          <p className='mt-4 text-gray-600'>Cargando rodeos...</p>
        </div>
      ) : rodeos.length === 0 ? (
        <div className='text-center py-12 bg-white rounded-lg shadow-md'>
          <div className='text-6xl mb-4'>🐄</div>
          <p className='text-gray-500 text-lg mb-4'>
            No hay rodeos registrados
          </p>
          {(userPayload?.rol === "admin" ||
            userPayload?.rol === "veterinario") && (
            <button
              onClick={abrirModalCrear}
              className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2'
            >
              <span>➕</span>
              Crear Primer Rodeo
            </button>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {rodeos.map((rodeo) => (
            <div
              key={rodeo.id_rodeo}
              className='bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-xl transition-all hover:border-blue-300'
            >
              {/* Header del Card */}
              <div className='mb-4 pb-4 border-b-2 border-gray-100'>
                <div className='flex items-start justify-between mb-2'>
                  <h3 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
                    {getTipoIcon(rodeo.tipo)} {rodeo.nombre}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(
                      rodeo.estado
                    )}`}
                  >
                    {rodeo.estado}
                  </span>
                </div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTipoColor(
                    rodeo.tipo
                  )}`}
                >
                  {rodeo.tipo?.charAt(0).toUpperCase() + rodeo.tipo?.slice(1)}
                </span>
              </div>

              {/* Información */}
              <div className='space-y-3 mb-4'>
                <div className='flex items-center gap-2 text-sm text-gray-600'>
                  <span>🏢</span>
                  <span className='font-semibold'>
                    {getNombreEstablecimiento(rodeo.id_establecimiento)}
                  </span>
                </div>

                <div className='flex items-center gap-2 text-sm text-gray-600'>
                  <span>🐮</span>
                  <span className='font-semibold text-blue-600'>
                    {rodeo.cantidad_terneros || 0} ternero(s)
                  </span>
                </div>

                {rodeo.descripcion && (
                  <div className='flex items-start gap-2 text-sm text-gray-600 mt-3 pt-3 border-t'>
                    <span>📝</span>
                    <span className='italic'>{rodeo.descripcion}</span>
                  </div>
                )}

                <div className='flex items-center gap-2 text-xs text-gray-500 mt-2'>
                  <span>📅</span>
                  <span>
                    Creado:{" "}
                    {new Date(rodeo.fecha_creacion).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className='flex gap-2 pt-4 border-t'>
                <button
                  onClick={() => verEstadisticas(rodeo)}
                  className='flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors text-sm font-medium'
                  title='Ver estadísticas'
                >
                  📊 Stats
                </button>
                {(userPayload?.rol === "admin" ||
                  userPayload?.rol === "veterinario") && (
                  <>
                    <button
                      onClick={() => abrirModalEditar(rodeo)}
                      className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-sm font-medium'
                      title='Editar'
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => toggleEstado(rodeo.id_rodeo)}
                      className={`flex-1 ${
                        rodeo.estado === "activo"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      } text-white py-2 rounded-lg transition-colors text-sm font-medium`}
                      title={
                        rodeo.estado === "activo" ? "Desactivar" : "Activar"
                      }
                    >
                      {rodeo.estado === "activo" ? "❌" : "✅"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREAR/EDITAR RODEO */}
      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg p-8 max-w-md w-full mx-4'>
            <h3 className='text-2xl font-bold mb-6 text-gray-800'>
              {modalMode === "crear" ? "➕ Crear Rodeo" : "✏️ Editar Rodeo"}
            </h3>

            <form onSubmit={guardarRodeo}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Nombre del Rodeo <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    required
                    placeholder='Ej: Rodeo Destete 2024'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Tipo de Rodeo
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='cria'>🍼 Cría</option>
                    <option value='destete'>🐄 Destete</option>
                    <option value='engorde'>🥩 Engorde</option>
                    <option value='reproduccion'>💕 Reproducción</option>
                    <option value='otro'>📋 Otro</option>
                  </select>
                </div>

                {userPayload?.rol === "admin" && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Establecimiento <span className='text-red-500'>*</span>
                    </label>
                    <select
                      value={formData.id_establecimiento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          id_establecimiento: e.target.value,
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                      required
                    >
                      <option value=''>Seleccionar establecimiento</option>
                      {establecimientos.map((est) => (
                        <option
                          key={est.id_establecimiento}
                          value={est.id_establecimiento}
                        >
                          {est.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    rows='3'
                    placeholder='Descripción del rodeo...'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) =>
                      setFormData({ ...formData, estado: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='activo'>✅ Activo</option>
                    <option value='inactivo'>❌ Inactivo</option>
                  </select>
                </div>
              </div>

              <div className='flex gap-3 mt-6'>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors'
                >
                  {modalMode === "crear" ? "➕ Crear" : "💾 Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESTADÍSTICAS */}
      {showStatsModal && statsData && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg p-8 max-w-lg w-full mx-4'>
            <h3 className='text-2xl font-bold mb-6 text-gray-800'>
              📊 Estadísticas: {statsData.rodeo.nombre}
            </h3>

            <div className='grid grid-cols-2 gap-4'>
              <div className='bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500'>
                <div className='text-sm text-blue-600 font-semibold mb-1'>
                  Total Terneros
                </div>
                <div className='text-3xl font-bold text-blue-700'>
                  {statsData.estadisticas.totalTerneros}
                </div>
              </div>

              <div className='bg-green-50 rounded-lg p-4 border-l-4 border-green-500'>
                <div className='text-sm text-green-600 font-semibold mb-1'>
                  Terneros Vivos
                </div>
                <div className='text-3xl font-bold text-green-700'>
                  {statsData.estadisticas.ternerosVivos}
                </div>
              </div>

              <div className='bg-red-50 rounded-lg p-4 border-l-4 border-red-500'>
                <div className='text-sm text-red-600 font-semibold mb-1'>
                  Mortalidad
                </div>
                <div className='text-3xl font-bold text-red-700'>
                  {statsData.estadisticas.porcentajeMortalidad}%
                </div>
              </div>

              <div className='bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500'>
                <div className='text-sm text-purple-600 font-semibold mb-1'>
                  Peso Promedio
                </div>
                <div className='text-3xl font-bold text-purple-700'>
                  {statsData.estadisticas.pesoPromedio} kg
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowStatsModal(false)}
              className='w-full mt-6 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors'
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListadoRodeo;
