import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("crear"); // 'crear' o 'editar'
  const [selectedUser, setSelectedUser] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    rol: "operario",
    telefono: "",
    estado: "activo",
  });

  const API_URL = "http://localhost:3000";

  // Obtener token del localStorage
  const getToken = () => localStorage.getItem("token");

  // Mostrar alerta
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
  };

  // Cargar usuarios
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

  // Cargar estadísticas
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

  useEffect(() => {
    cargarUsuarios();
    cargarEstadisticas();
  }, []);

  // Abrir modal para crear
  const abrirModalCrear = () => {
    setModalMode("crear");
    setFormData({
      name: "",
      email: "",
      password: "",
      rol: "operario",
      telefono: "",
      estado: "activo",
    });
    setShowModal(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (user) => {
    setModalMode("editar");
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      rol: user.rol,
      telefono: user.telefono || "",
      estado: user.estado,
    });
    setShowModal(true);
  };

  // Guardar usuario (crear o editar)
  const guardarUsuario = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name || !formData.email) {
      showAlert("Nombre y email son obligatorios", "error");
      return;
    }

    if (modalMode === "crear" && !formData.password) {
      showAlert("La contraseña es obligatoria", "error");
      return;
    }

    try {
      if (modalMode === "crear") {
        await axios.post(`${API_URL}/users`, formData, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        showAlert("Usuario creado correctamente", "success");
      } else {
        // Si no se cambió la contraseña, no enviarla
        const dataToSend = { ...formData };
        if (!dataToSend.password) {
          delete dataToSend.password;
        }

        await axios.put(`${API_URL}/users/${selectedUser.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        showAlert("Usuario actualizado correctamente", "success");
      }

      setShowModal(false);
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

  // Eliminar usuario
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

  // Cambiar estado del usuario
  const toggleEstado = async (id) => {
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

  // Obtener color según rol
  const getRolColor = (rol) => {
    const colors = {
      admin: "bg-purple-100 text-purple-800",
      veterinario: "bg-blue-100 text-blue-800",
      operario: "bg-green-100 text-green-800",
    };
    return colors[rol] || "bg-gray-100 text-gray-800";
  };

  // Obtener icono según rol
  const getRolIcon = (rol) => {
    const icons = {
      admin: "👑",
      veterinario: "🩺",
      operario: "👷",
    };
    return icons[rol] || "👤";
  };

  // Obtener color según estado
  const getEstadoColor = (estado) => {
    return estado === "activo"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
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
          Gestiona usuarios y configuración del sistema
        </p>
      </div>

      {/* Estadísticas */}
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
                <div className='text-sm text-gray-600 mb-1'>Activos</div>
                <div className='text-3xl font-bold text-green-600'>
                  {stats.activos}
                </div>
              </div>
              <div className='text-4xl'>✅</div>
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm text-gray-600 mb-1'>Inactivos</div>
                <div className='text-3xl font-bold text-red-600'>
                  {stats.inactivos}
                </div>
              </div>
              <div className='text-4xl'>❌</div>
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

      {/* Contenido según tab activo */}
      {activeTab === "usuarios" && (
        <div className='bg-white rounded-lg shadow-md p-6'>
          {/* Header con botón crear */}
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-2xl font-bold text-gray-800'>
              Usuarios del Sistema
            </h2>
            <button
              onClick={abrirModalCrear}
              className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg'
            >
              <span>➕</span>
              Crear Usuario
            </button>
          </div>

          {/* Tabla de usuarios */}
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
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>
                      ID
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>
                      Nombre
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>
                      Email
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>
                      Rol
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>
                      Estado
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>
                      Teléfono
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>
                      Último Acceso
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-semibold text-gray-600'>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-4 py-3 text-sm'>{user.id}</td>
                      <td className='px-4 py-3 text-sm font-medium'>
                        {user.name}
                      </td>
                      <td className='px-4 py-3 text-sm'>{user.email}</td>
                      <td className='px-4 py-3'>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getRolColor(
                            user.rol
                          )} flex items-center gap-1 w-fit`}
                        >
                          {getRolIcon(user.rol)} {user.rol}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <button
                          onClick={() => toggleEstado(user.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(
                            user.estado
                          )} hover:opacity-80 transition-opacity cursor-pointer`}
                        >
                          {user.estado}
                        </button>
                      </td>
                      <td className='px-4 py-3 text-sm'>
                        {user.telefono || "-"}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600'>
                        {user.ultimo_acceso
                          ? new Date(user.ultimo_acceso).toLocaleDateString(
                              "es-AR"
                            )
                          : "Nunca"}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex justify-center gap-2'>
                          <button
                            onClick={() => abrirModalEditar(user)}
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

      {activeTab === "configuracion" && (
        <div className='bg-white rounded-lg shadow-md p-6'>
          <h2 className='text-2xl font-bold text-gray-800 mb-4'>
            Configuración del Sistema
          </h2>
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
            <p className='text-gray-600'>
              🚧 <strong>Próximamente:</strong> Configuración de parámetros de
              salud, alertas, umbrales de mortalidad/morbilidad, y
              notificaciones.
            </p>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Usuario */}
      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto'>
            <h3 className='text-2xl font-bold mb-6 text-gray-800'>
              {modalMode === "crear" ? "➕ Crear Usuario" : "✏️ Editar Usuario"}
            </h3>

            <form onSubmit={guardarUsuario}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Nombre <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    required
                    placeholder='Juan Pérez'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Email <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='email'
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    required
                    placeholder='juan@ejemplo.com'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Contraseña{" "}
                    {modalMode === "editar" && "(dejar vacío para no cambiar)"}
                    {modalMode === "crear" && (
                      <span className='text-red-500'>*</span>
                    )}
                  </label>
                  <input
                    type='password'
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    required={modalMode === "crear"}
                    placeholder='Mínimo 6 caracteres'
                    minLength={6}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Rol
                  </label>
                  <select
                    value={formData.rol}
                    onChange={(e) =>
                      setFormData({ ...formData, rol: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='operario'>👷 Operario</option>
                    <option value='veterinario'>🩺 Veterinario</option>
                    <option value='admin'>👑 Administrador</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Teléfono
                  </label>
                  <input
                    type='tel'
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='+54 379 4123456'
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
    </div>
  );
};

export default AdminPanel;
