"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUserData, setAuthPayload, setStatus } from "@/store/auth"; // ✅ AGREGAR ESTE IMPORT
import { useBussinesMicroservicio } from "@/hooks/bussines";

const ListadoRodeo = () => {
  const dispatch = useDispatch(); // ✅ Agregar dispatch
  const { userPayload, establecimientoActual } = useSelector(
    (state) => state.auth
  );

  // ✅ AGREGAR: Cargar desde localStorage
  useEffect(() => {
    // Verificar que estamos en el cliente (navegador)
    if (typeof window === "undefined") return;

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
    obtenerTerneroHook,
    asignarTernerosRodeoHook,
    desasignarTernerosRodeoHook,
    obtenerMadreHook,
    asignarMadresRodeoHook,
    desasignarMadresRodeoHook,
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
  // Asignación de animales a rodeo
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [rodeoParaAsignar, setRodeoParaAsignar] = useState(null);
  const [tabAsignar, setTabAsignar] = useState("terneros"); // "terneros" | "madres"
  const [ternerosDisponibles, setTernerosDisponibles] = useState([]);
  const [ternerosDelRodeo, setTernerosDelRodeo] = useState([]);
  const [ternerosSeleccionados, setTernerosSeleccionados] = useState([]);
  const [madresDisponibles, setMadresDisponibles] = useState([]);
  const [madresDelRodeo, setMadresDelRodeo] = useState([]);
  const [madresSeleccionadas, setMadresSeleccionadas] = useState([]);
  const [loadingTerneros, setLoadingTerneros] = useState(false);

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

  // Helpers para construir query según multi-tenancy (admin / no-admin)
  const buildTernerosQuery = (extra = "") => {
    let qp = [];
    if (userPayload?.rol === "admin" && establecimientoActual) {
      qp.push(`id_establecimiento=${establecimientoActual}`);
    }
    // `estado=Vivo` es un ejemplo, podés quitarlo si querés todos
    qp.push("estado=Vivo");
    if (extra) qp.push(extra);
    return qp.join("&");
  };

  // Abrir modal y cargar datos
  const abrirModalAsignar = async (rodeo) => {
    setShowAsignarModal(true);
    setRodeoParaAsignar(rodeo);
    setTabAsignar("terneros");
    setTernerosSeleccionados([]);
    setMadresSeleccionadas([]);
    await cargarTernerosData(rodeo);
    await cargarMadresData(rodeo);
  };

  const buildQpBase = () =>
    userPayload?.rol === "admin" && establecimientoActual
      ? `id_establecimiento=${establecimientoActual}`
      : `id_establecimiento=${userPayload?.id_establecimiento}`;

  const cargarTernerosData = async (rodeo) => {
    setLoadingTerneros(true);
    try {
      const qpBase = buildQpBase();
      const respDisp = await obtenerTerneroHook(`${qpBase}&sin_rodeo=true&estado=Vivo&limit=500`);
      const respAsig = await obtenerTerneroHook(`${qpBase}&id_rodeo=${rodeo.id_rodeo}&estado=Vivo&limit=500`);
      setTernerosDisponibles(respDisp?.data?.data || []);
      setTernerosDelRodeo(respAsig?.data?.data || []);
    } catch (e) {
      console.error("Error al cargar terneros:", e);
      showAlert("Error al cargar terneros", "error");
    } finally {
      setLoadingTerneros(false);
    }
  };

  const cargarMadresData = async (rodeo) => {
    try {
      const qpBase = buildQpBase();
      const respDisp = await obtenerMadreHook(`${qpBase}&sin_rodeo=true&limit=500`);
      const respAsig = await obtenerMadreHook(`${qpBase}&id_rodeo=${rodeo.id_rodeo}&limit=500`);
      setMadresDisponibles(respDisp?.data?.data || []);
      setMadresDelRodeo(respAsig?.data?.data || []);
    } catch (e) {
      console.error("Error al cargar madres:", e);
      showAlert("Error al cargar madres", "error");
    }
  };

  const toggleSeleccion = (id_ternero) => {
    setTernerosSeleccionados((prev) =>
      prev.includes(id_ternero)
        ? prev.filter((id) => id !== id_ternero)
        : [...prev, id_ternero]
    );
  };

  const toggleSeleccionMadre = (id_madre) => {
    setMadresSeleccionadas((prev) =>
      prev.includes(id_madre)
        ? prev.filter((id) => id !== id_madre)
        : [...prev, id_madre]
    );
  };

  // Asignar terneros
  const handleAsignarTerneros = async () => {
    if (!rodeoParaAsignar || ternerosSeleccionados.length === 0) return;
    setLoadingTerneros(true);
    try {
      const resp = await asignarTernerosRodeoHook(rodeoParaAsignar.id_rodeo, {
        ids_terneros: ternerosSeleccionados,
      });
      if (resp?.status === 200 || resp?.status === 201) {
        showAlert("Terneros asignados correctamente", "success");
        await cargarTernerosData(rodeoParaAsignar);
        await cargarRodeos();
        setTernerosSeleccionados([]);
      } else {
        showAlert(resp?.data?.message || "No se pudieron asignar terneros", "error");
      }
    } catch (e) {
      console.error("Error al asignar terneros:", e);
      showAlert("Error al asignar terneros", "error");
    } finally {
      setTimeout(() => setLoadingTerneros(false), 300);
    }
  };

  // Desasignar terneros
  const handleDesasignarTerneros = async () => {
    if (!rodeoParaAsignar || ternerosSeleccionados.length === 0) return;
    setLoadingTerneros(true);
    try {
      const resp = await desasignarTernerosRodeoHook(rodeoParaAsignar.id_rodeo, {
        ids_terneros: ternerosSeleccionados,
      });
      if (resp?.status === 200 || resp?.status === 201) {
        showAlert("Terneros desasignados correctamente", "success");
        await cargarTernerosData(rodeoParaAsignar);
        await cargarRodeos();
        setTernerosSeleccionados([]);
      } else {
        showAlert(resp?.data?.message || "No se pudieron desasignar terneros", "error");
      }
    } catch (e) {
      console.error("Error al desasignar terneros:", e);
      showAlert("Error al desasignar terneros", "error");
    } finally {
      setTimeout(() => setLoadingTerneros(false), 300);
    }
  };

  // Asignar madres
  const handleAsignarMadres = async () => {
    if (!rodeoParaAsignar || madresSeleccionadas.length === 0) return;
    setLoadingTerneros(true);
    try {
      const resp = await asignarMadresRodeoHook(rodeoParaAsignar.id_rodeo, {
        ids_madres: madresSeleccionadas,
      });
      if (resp?.status === 200 || resp?.status === 201) {
        showAlert("Madres asignadas correctamente", "success");
        await cargarMadresData(rodeoParaAsignar);
        setMadresSeleccionadas([]);
      } else {
        showAlert(resp?.data?.message || "No se pudieron asignar madres", "error");
      }
    } catch (e) {
      console.error("Error al asignar madres:", e);
      showAlert("Error al asignar madres", "error");
    } finally {
      setTimeout(() => setLoadingTerneros(false), 300);
    }
  };

  // Desasignar madres
  const handleDesasignarMadres = async () => {
    if (!rodeoParaAsignar || madresSeleccionadas.length === 0) return;
    setLoadingTerneros(true);
    try {
      const resp = await desasignarMadresRodeoHook(rodeoParaAsignar.id_rodeo, {
        ids_madres: madresSeleccionadas,
      });
      if (resp?.status === 200 || resp?.status === 201) {
        showAlert("Madres desasignadas correctamente", "success");
        await cargarMadresData(rodeoParaAsignar);
        setMadresSeleccionadas([]);
      } else {
        showAlert(resp?.data?.message || "No se pudieron desasignar madres", "error");
      }
    } catch (e) {
      console.error("Error al desasignar madres:", e);
      showAlert("Error al desasignar madres", "error");
    } finally {
      setTimeout(() => setLoadingTerneros(false), 300);
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

      {/* Header - Responsive */}
      <div className='mb-6'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-800'>
              🐄 Gestión de Rodeos
            </h1>
            <p className='text-sm sm:text-base text-gray-600 mt-1'>
              Administra los rodeos de tu establecimiento
            </p>
          </div>
          {(userPayload?.rol === "admin" ||
            userPayload?.rol === "veterinario") && (
            <button
              onClick={abrirModalCrear}
              className='w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md text-sm sm:text-base'
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
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'>
          {rodeos.map((rodeo) => (
            <div
              key={rodeo.id_rodeo}
              className='bg-white border-2 border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-xl transition-all hover:border-blue-300'
            >
              {/* Header del Card */}
              <div className='mb-4 pb-4 border-b-2 border-gray-100'>
                <div className='flex items-start justify-between mb-2'>
                  <h3 className='text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2 break-words'>
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
              {/* Acciones - Responsive */}
              <div className='flex flex-col sm:flex-row gap-2 pt-4 border-t'>
                <button
                  onClick={() => verEstadisticas(rodeo)}
                  className='flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium'
                  title='Ver estadísticas'
                >
                  📊 Stats
                </button>
                {(userPayload?.rol === "admin" ||
                  userPayload?.rol === "veterinario") && (
                  <>
                    <button
                      onClick={() => abrirModalEditar(rodeo)}
                      className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium'
                      title='Editar'
                    >
                      ✏️ Editar
                    </button>

                    <button
                      onClick={() => abrirModalAsignar(rodeo)}
                      className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium'
                      title='Asignar / Desasignar terneros'
                    >
                      🧩 Asignar
                    </button>

                    <button
                      onClick={() => toggleEstado(rodeo.id_rodeo)}
                      className={`flex-1 ${
                        rodeo.estado === "activo"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      } text-white py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium`}
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
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4'>
          <div className='bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-md w-full mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto'>
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
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4'>
          <div className='bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-lg w-full mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto'>
            <h3 className='text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 break-words'>
              📊 Estadísticas: {statsData.rodeo.nombre}
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
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
      {showAsignarModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4'>
          <div className='bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto'>
            <div className='flex items-start justify-between mb-4'>
              <h3 className='text-lg sm:text-xl md:text-2xl font-bold break-words'>
                🧩 Asignar Animales — {rodeoParaAsignar?.nombre}
              </h3>
              <button
                onClick={() => setShowAsignarModal(false)}
                className='text-gray-500 hover:text-gray-700'
                title='Cerrar'
              >
                ✖
              </button>
            </div>

            {/* Tabs */}
            <div className='flex gap-2 mb-4 border-b'>
              <button
                onClick={() => { setTabAsignar("terneros"); setTernerosSeleccionados([]); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tabAsignar === "terneros"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                🐮 Terneros
              </button>
              <button
                onClick={() => { setTabAsignar("madres"); setMadresSeleccionadas([]); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tabAsignar === "madres"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                🐄 Madres
              </button>
            </div>

            {loadingTerneros ? (
              <div className='text-center py-8'>
                <div className='inline-block animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent' />
                <p className='mt-3 text-gray-600'>Cargando…</p>
              </div>
            ) : tabAsignar === "terneros" ? (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'>
                {/* TERNEROS DISPONIBLES */}
                <div className='border rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='font-semibold text-emerald-700'>
                      Disponibles ({ternerosDisponibles.length})
                    </h4>
                    <button
                      onClick={() => setTernerosSeleccionados(ternerosDisponibles.map((t) => t.id_ternero))}
                      className='text-sm text-emerald-600 hover:underline'
                    >
                      Seleccionar todos
                    </button>
                  </div>
                  <div className='max-h-64 overflow-auto space-y-2'>
                    {ternerosDisponibles.length === 0 ? (
                      <p className='text-sm text-gray-500'>No hay terneros disponibles.</p>
                    ) : (
                      ternerosDisponibles.map((t) => (
                        <label key={`disp-${t.id_ternero}`} className='flex items-center gap-3 p-2 rounded hover:bg-gray-50'>
                          <input
                            type='checkbox'
                            checked={ternerosSeleccionados.includes(t.id_ternero)}
                            onChange={() => toggleSeleccion(t.id_ternero)}
                          />
                          <div className='text-sm'>
                            <div className='font-medium text-gray-800'>#{t.id_ternero} — {t.nombre || "Ternero"}</div>
                            <div className='text-gray-500'>{t.estado} · Peso: {t.peso_nacer || "-"} kg</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                {/* TERNEROS EN EL RODEO */}
                <div className='border rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='font-semibold text-blue-700'>
                      En este rodeo ({ternerosDelRodeo.length})
                    </h4>
                    <button
                      onClick={() => setTernerosSeleccionados(ternerosDelRodeo.map((t) => t.id_ternero))}
                      className='text-sm text-blue-600 hover:underline'
                    >
                      Seleccionar todos
                    </button>
                  </div>
                  <div className='max-h-64 overflow-auto space-y-2'>
                    {ternerosDelRodeo.length === 0 ? (
                      <p className='text-sm text-gray-500'>No hay terneros en este rodeo.</p>
                    ) : (
                      ternerosDelRodeo.map((t) => (
                        <label key={`rodeo-${t.id_ternero}`} className='flex items-center gap-3 p-2 rounded hover:bg-gray-50'>
                          <input
                            type='checkbox'
                            checked={ternerosSeleccionados.includes(t.id_ternero)}
                            onChange={() => toggleSeleccion(t.id_ternero)}
                          />
                          <div className='text-sm'>
                            <div className='font-medium text-gray-800'>#{t.id_ternero} — {t.nombre || "Ternero"}</div>
                            <div className='text-gray-500'>{t.estado} · Peso: {t.peso_nacer || "-"} kg</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'>
                {/* MADRES DISPONIBLES */}
                <div className='border rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='font-semibold text-emerald-700'>
                      Disponibles ({madresDisponibles.length})
                    </h4>
                    <button
                      onClick={() => setMadresSeleccionadas(madresDisponibles.map((m) => m.id_madre))}
                      className='text-sm text-emerald-600 hover:underline'
                    >
                      Seleccionar todas
                    </button>
                  </div>
                  <div className='max-h-64 overflow-auto space-y-2'>
                    {madresDisponibles.length === 0 ? (
                      <p className='text-sm text-gray-500'>No hay madres disponibles.</p>
                    ) : (
                      madresDisponibles.map((m) => (
                        <label key={`mdisp-${m.id_madre}`} className='flex items-center gap-3 p-2 rounded hover:bg-gray-50'>
                          <input
                            type='checkbox'
                            checked={madresSeleccionadas.includes(m.id_madre)}
                            onChange={() => toggleSeleccionMadre(m.id_madre)}
                          />
                          <div className='text-sm'>
                            <div className='font-medium text-gray-800'>
                              {m.nombre}{m.rp_madre ? ` — RP ${m.rp_madre}` : ""}
                            </div>
                            <div className='text-gray-500'>{m.estado}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                {/* MADRES EN EL RODEO */}
                <div className='border rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='font-semibold text-blue-700'>
                      En este rodeo ({madresDelRodeo.length})
                    </h4>
                    <button
                      onClick={() => setMadresSeleccionadas(madresDelRodeo.map((m) => m.id_madre))}
                      className='text-sm text-blue-600 hover:underline'
                    >
                      Seleccionar todas
                    </button>
                  </div>
                  <div className='max-h-64 overflow-auto space-y-2'>
                    {madresDelRodeo.length === 0 ? (
                      <p className='text-sm text-gray-500'>No hay madres en este rodeo.</p>
                    ) : (
                      madresDelRodeo.map((m) => (
                        <label key={`mrodeo-${m.id_madre}`} className='flex items-center gap-3 p-2 rounded hover:bg-gray-50'>
                          <input
                            type='checkbox'
                            checked={madresSeleccionadas.includes(m.id_madre)}
                            onChange={() => toggleSeleccionMadre(m.id_madre)}
                          />
                          <div className='text-sm'>
                            <div className='font-medium text-gray-800'>
                              {m.nombre}{m.rp_madre ? ` — RP ${m.rp_madre}` : ""}
                            </div>
                            <div className='text-gray-500'>{m.estado}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6'>
              {tabAsignar === "terneros" ? (
                <>
                  <button
                    onClick={handleAsignarTerneros}
                    className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg disabled:opacity-60'
                    disabled={loadingTerneros || ternerosSeleccionados.length === 0}
                  >
                    ➕ Asignar al rodeo
                  </button>
                  <button
                    onClick={handleDesasignarTerneros}
                    className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg disabled:opacity-60'
                    disabled={loadingTerneros || ternerosSeleccionados.length === 0}
                  >
                    ↩️ Sacar del rodeo
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleAsignarMadres}
                    className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg disabled:opacity-60'
                    disabled={loadingTerneros || madresSeleccionadas.length === 0}
                  >
                    ➕ Asignar al rodeo
                  </button>
                  <button
                    onClick={handleDesasignarMadres}
                    className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg disabled:opacity-60'
                    disabled={loadingTerneros || madresSeleccionadas.length === 0}
                  >
                    ↩️ Sacar del rodeo
                  </button>
                </>
              )}
              <button
                onClick={() => setShowAsignarModal(false)}
                className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg'
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListadoRodeo;
