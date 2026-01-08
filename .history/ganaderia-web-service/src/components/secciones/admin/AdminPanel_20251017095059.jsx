import React, { useState, useEffect } from "react";
import axios from "axios";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const AdminPanel = () => {
  const { 
    obtenerEstablecimientosHook,
    crearEstablecimientoHook,
    actualizarEstablecimientoHook,
    eliminarEstablecimientoHook,
    toggleEstadoEstablecimientoHook,
  } = useBussinesMicroservicio();
  
  const [activeTab, setActiveTab] = useState("usuarios");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para modal de usuarios
  const [showModalUsuario, setShowModalUsuario] = useState(false);
  const [modalModeUsuario, setModalModeUsuario] = useState("crear");
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Estados para modal de establecimientos
  const [showModalEstablecimiento, setShowModalEstablecimiento] = useState(false);
  const [modalModeEstablecimiento, setModalModeEstablecimiento] = useState("crear");
  const [selectedEstablecimiento, setSelectedEstablecimiento] = useState(null);
  
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  
  const [formDataUsuario, setFormDataUsuario] = useState({
    name: "",
    email: "",
    password: "",
    rol: "operario",
    telefono: "",
    estado: "activo",
    id_establecimiento: "",
  });

  const [formDataEstablecimiento, setFormDataEstablecimiento] = useState({
    nombre: "",
    ubicacion: "",
    telefono: "",
    responsable: "",
    notas: "",
    estado: "activo",
  });

  const API_URL = "http://localhost:3001";

  const getToken = () => localStorage.getItem("token");

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
  };

  // ========== FUNCIONES DE USUARIOS ==========
  
  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      showAlert("Error al cargar usuarios", "error");
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const abrirModalCrearUsuario = () => {
    setModalModeUsuario("crear");
    setFormDataUsuario({
      name: "",
      email: "",
      password: "",
      rol: "operario",
      telefono: "",
      estado: "activo",
      id_establecimiento: "",
    });
    setShowModalUsuario(true);
  };

  const abrirModalEditarUsuario = (user) => {
    setModalModeUsuario("editar");
    setSelectedUser(user);
    setFormDataUsuario({
      name: user.name,
      email: user.email,
      password: "",
      rol: user.rol,
      telefono: user.telefono || "",
      estado: user.estado,
      id_establecimiento: user.id_establecimiento || "",
    });
    setShowModalUsuario(true);
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();

    if (!formDataUsuario.name || !formDataUsuario.email) {
      showAlert("Nombre y email son obligatorios", "error");
      return;
    }

    if (modalModeUsuario === "crear" && !formDataUsuario.password) {
      showAlert("La contraseña es obligatoria", "error");
      return;
    }

    try {
      const dataToSend = {
        ...formDataUsuario,
        id_establecimiento: formDataUsuario.id_establecimiento 
          ? parseInt(formDataUsuario.id_establecimiento, 10) 
          : null,
      };

      if (modalModeUsuario === "crear") {
        await axios.post(`${API_URL}/users`, dataToSend, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        showAlert("Usuario creado correctamente", "success");
      } else {
        if (!dataToSend.password) {
          delete dataToSend.password;
        }

        await axios.put(`${API_URL}/users/${selectedUser.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        showAlert("Usuario actualizado correctamente", "success");
      }

      setShowModalUsuario(false);
      cargarUsuarios();
      cargarEstadisticas();
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      showAlert(
        error.response?.data?.message || "Error al guardar usuario",
        "error"
      );
    }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm("¿Estás seguro de desactivar este usuario?")) return;

    try {
      await axios.delete(`${API_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      showAlert("Usuario desactivado correctamente", "success");
      cargarUsuarios();
      cargarEstadisticas();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      showAlert("Error al desactivar usuario", "error");
    }
  };

  const toggleEstadoUsuario = async (id) => {
    try {
      await axios.put(
        `${API_URL}/users/${id}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      showAlert("Estado actualizado correctamente", "success");
      cargarUsuarios();
      cargarEstadisticas();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      showAlert("Error al cambiar estado", "error");
    }
  };

  // ========== FUNCIONES DE ESTABLECIMIENTOS ==========

  const cargarEstablecimientos = async () => {
    setLoading(true);
    try {
      const response = await obtenerEstablecimientosHook();
      if (response?.status === 200) {
        setEstablecimientos(response.data);
        console.log('🏢 Establecimientos cargados:', response.data);
      }
    } catch (error) {
      console.error('Error al cargar establecimientos:', error);
      showAlert("Error al cargar establecimientos", "error");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrearEstablecimiento = () => {
    setModalModeEstablecimiento("crear");
    setFormDataEstablecimiento({
      nombre: "",
      ubicacion: "",
      telefono: "",
      responsable: "",
      notas: "",
      estado: "activo",
    });
    setShowModalEstablecimiento(true);
  };

  const abrirModalEditarEstablecimiento = (est) => {
    setModalModeEstablecimiento("editar");
    setSelectedEstablecimiento(est);
    setFormDataEstablecimiento({
      nombre: est.nombre,
      ubicacion: est.ubicacion || "",
      telefono: est.telefono || "",
      responsable: est.responsable || "",
      notas: est.notas || "",
      estado: est.estado,
    });
    setShowModalEstablecimiento(true);
  };

  const guardarEstablecimiento = async (e) => {
    e.preventDefault();

    if (!formDataEstablecimiento.nombre) {
      showAlert("El nombre es obligatorio", "error");
      return;
    }

    try {
      if (modalModeEstablecimiento === "crear") {
        await crearEstablecimientoHook(formDataEstablecimiento);
        showAlert("Establecimiento creado correctamente", "success");
      } else {
        await actualizarEstablecimientoHook(
          selectedEstablecimiento.id_establecimiento,
          formDataEstablecimiento
        );
        showAlert("Establecimiento actualizado correctamente", "success");
      }

      setShowModalEstablecimiento(false);
      cargarEstablecimientos();
    } catch (error) {
      console.error("Error al guardar establecimiento:", error);
      showAlert("Error al guardar establecimiento", "error");
    }
  };

  const eliminarEstablecimiento = async (id) => {
    // Verificar si tiene usuarios asignados
    const usuariosAsignados = users.filter(u => u.id_establecimiento === id).length;
    
    if (usuariosAsignados > 0) {
      if (!window.confirm(
        `Este establecimiento tiene ${usuariosAsignados} usuario(s) asignado(s). ¿Estás seguro de desactivarlo? Los usuarios no podrán acceder hasta que se les asigne otro establecimiento.`
      )) return;
    } else {
      if (!window.confirm("¿Estás seguro de desactivar este establecimiento?")) return;
    }

    try {
      await toggleEstadoEstablecimientoHook(id);
      showAlert("Estado actualizado correctamente", "success");
      cargarEstablecimientos();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      showAlert("Error al cambiar estado", "error");
    }
  };

  // ========== UTILIDADES ==========

  useEffect(() => {
    cargarUsuarios();
    cargarEstadisticas();
    cargarEstablecimientos();
  }, []);

  const getRolColor = (rol) => {
    const colors = {
      admin: "bg-purple-100 text-purple-800",
      veterinario: "bg-blue-100 text-blue-800",
      operario: "bg-green-100 text-green-800",
    };
    return colors[rol] || "bg-gray-100 text-gray-800";
  };

  const getRolIcon = (rol) => {
    const icons = {
      admin: "👑",
      veterinario: "🩺",
      operario: "👷",
    };
    return icons[rol] || "👤";
  };

  const getEstadoColor = (estado) => {
    return estado === "activo"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getNombreEstablecimiento = (id) => {
    if (!id) return "Sin asignar";
    const est = establecimientos.find(e => e.id_establecimiento === id);
    return est ? est.nombre : `ID: ${id}`;
  };

  const contarUsuariosPorEstablecimiento = (id) => {
    return users.filter(u => u.id_establecimiento === id).length;
  };

  // Estadísticas de establecimientos
  const statsEstablecimientos = {
    total: establecimientos.length,
    activos: establecimientos.filter(e => e.estado === 'activo').length,
    inactivos: establecimientos.filter(e => e.estado === 'inactivo').length,
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6'>
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
      <div className='mb-8'>
        <h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2'>
          🎛️ Panel de Administración
        </h1>
        <p className='text-gray-600'>
          Gestiona usuarios, establecimientos y configuración del sistema
        </p>
      </div>

      {/* Estadísticas Globales */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
          <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm text-gray-600 mb-1'>Total Usuarios</div>
                <div className='text-3xl font-bold text-blue-600'>
                  {stats.total}
                </div>
              </div>
              <div className='text-4xl'>👥</div>
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm text-gray-600 mb-1'>Usuarios Activos</div>
                <div className='text-3xl font-bold text-green-600'>
                  {stats.activos}
                </div>
              </div>
              <div className='text-4xl'>✅</div>
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm text-gray-600 mb-1'>Establecimientos</div>
                <div className='text-3xl font-bold text-orange-600'>
                  {statsEstablecimientos.total}
                </div>
              </div>
              <div className='text-4xl'>🏢</div>
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow'>
            <div>
              <div className='text-sm text-gray-600 mb-2'>Por Rol</div>
              <div className='space-y-1'>
                {stats.por_rol.map((item, index) => (
                  <div
                    key={index}
                    className='flex justify-between items-center text-sm'
                  >
                    <span className='capitalize flex items-center gap-1'>
                      {getRolIcon(item.rol)} {item.rol}:
                    </span>
                    <span className='font-semibold'>{item.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className='bg-white rounded-lg shadow-md mb-6'>
        <div className='flex border-b'>
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "usuarios"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            👥 Gestión de Usuarios
          </button>
          <button
            onClick={() => setActiveTab("establecimientos")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "establecimientos"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            🏢 Establecimientos
          </button>
          <button
            onClick={() => setActiveTab("configuracion")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "configuracion"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            ⚙️ Configuración
          </button>
        </div>
      </div>

      {/* TAB: USUARIOS */}
      {activeTab === "usuarios" && (
        <div className='bg-white rounded-lg shadow-md p-6'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-2xl font-bold text-gray-800'>
              Usuarios del Sistema
            </h2>
            <button
              onClick={abrirModalCrearUsuario}
              className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg'
            >
              <span>➕</span>
              Crear Usuario
            </button>
          </div>

          {loading ? (
            <div className='text-center py-8'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent'></div>
              <p className='mt-2 text-gray-600'>Cargando...</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>ID</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>Nombre</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>Email</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>Rol</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>Estado</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>Establecimiento</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>Teléfono</th>
                    <th className='px-4 py-3 text-center text-sm font-semibold text-gray-600'>Acciones</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {users.map((user) => (
                    <tr key={user.id} className='hover:bg-gray-50 transition-colors'>
                      <td className='px-4 py-3 text-sm'>{user.id}</td>
                      <td className='px-4 py-3 text-sm font-medium'>{user.name}</td>
                      <td className='px-4 py-3 text-sm'>{user.email}</td>
                      <td className='px-4 py-3'>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRolColor(user.rol)} flex items-center gap-1 w-fit`}>
                          {getRolIcon(user.rol)} {user.rol}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <button
                          onClick={() => toggleEstadoUsuario(user.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(user.estado)} hover:opacity-80 transition-opacity cursor-pointer`}
                        >
                          {user.estado}
                        </button>
                      </td>
                      <td className='px-4 py-3 text-sm'>
                        <span className={user.id_establecimiento ? 'text-gray-700' : 'text-red-500 italic'}>
                          🏢 {getNombreEstablecimiento(user.id_establecimiento)}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-sm'>{user.telefono || "-"}</td>
                      <td className='px-4 py-3'>
                        <div className='flex justify-center gap-2'>
                          <button
                            onClick={() => abrirModalEditarUsuario(user)}
                            className='text-blue-600 hover:text-blue-800 transition-colors text-xl'
                            title='Editar'
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => eliminarUsuario(user.id)}
                            className='text-red-600 hover:text-red-800 transition-colors text-xl'
                            title='Desactivar'
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: ESTABLECIMIENTOS */}
      {activeTab === "establecimientos" && (
        <div className='bg-white rounded-lg shadow-md p-6'>
          <div className='flex justify-between items-center mb-6'>
            <div>
              <h2 className='text-2xl font-bold text-gray-800'>
                Gestión de Establecimientos
              </h2>
              <p className='text-sm text-gray-500 mt-1'>
                Total: {statsEstablecimientos.total} | Activos: {statsEstablecimientos.activos} | Inactivos: {statsEstablecimientos.inactivos}
              </p>
            </div>
            <button
              onClick={abrirModalCrearEstablecimiento}
              className='bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg'
            >
              <span>➕</span>
              Crear Establecimiento
            </button>
          </div>

          {loading ? (
            <div className='text-center py-8'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent'></div>
              <p className='mt-2 text-gray-600'>Cargando...</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {establecimientos.map((est) => (
                <div
                  key={est.id_establecimiento}
                  className='bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow'
                >
                  <div className='flex justify-between items-start mb-4'>
                    <div className='flex-1'>
                      <h3 className='text-xl font-bold text-gray-800 mb-1'>
                        🏢 {est.nombre}
                      </h3>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(est.estado)}`}
                      >
                        {est.estado}
                      </span>
                    </div>
                  </div>

                  <div className='space-y-2 text-sm text-gray-600 mb-4'>
                    {est.ubicacion && (
                      <div className='flex items-start gap-2'>
                        <span className='text-lg'>📍</span>
                        <span>{est.ubicacion}</span>
                      </div>
                    )}
                    {est.responsable && (
                      <div className='flex items-start gap-2'>
                        <span className='text-lg'>👤</span>
                        <span>{est.responsable}</span>
                      </div>
                    )}
                    {est.telefono && (
                      <div className='flex items-start gap-2'>
                        <span className='text-lg'>📞</span>
                        <span>{est.telefono}</span>
                      </div>
                    )}
                    <div className='flex items-start gap-2'>
                      <span className='text-lg'>👥</span>
                      <span className='font-semibold text-blue-600'>
                        {contarUsuariosPorEstablecimiento(est.id_establecimiento)} usuario(s)
                      </span>
                    </div>
                    {est.notas && (
                      <div className='flex items-start gap-2 mt-3 pt-3 border-t'>
                        <span className='text-lg'>📝</span>
                        <span className='text-xs italic'>{est.notas}</span>
                      </div>
                    )}
                  </div>

                  <div className='flex gap-2 pt-4 border-t'>
                    <button
                      onClick={() => abrirModalEditarEstablecimiento(est)}
                      className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-sm font-medium'
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => eliminarEstablecimiento(est.id_establecimiento)}
                      className={`flex-1 ${
                        est.estado === 'activo'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white py-2 rounded-lg transition-colors text-sm font-medium`}
                    >
                      {est.estado === 'activo' ? '❌ Desactivar' : '✅ Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {establecimientos.length === 0 && !loading && (
            <div className='text-center py-12'>
              <div className='text-6xl mb-4'>🏢</div>
              <p className='text-gray-500 text-lg'>
                No hay establecimientos registrados
              </p>
              <button
                onClick