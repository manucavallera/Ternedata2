import React, { useState, useEffect } from "react";
import axios from "axios";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setSeccionStatus } from "@/store/seccion";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import EstablecimientoBadge from "@/components/EstablecimientoBadge";
import EstablecimientoSelector from "@/components/EstablecimientoSelector";
import { TeamManager } from "@/components/TeamManager"; // 👈 1. AGREGAR ESTO
import { setUserData, setEstablecimientoActual } from "@/store/auth/authSlice";

const AdminPanel = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { userPayload } = useSelector((state) => state.auth); // Agregar esta línea

  const { establecimientoActual } = useSelector(
    (state) => state.auth || {}, // ✅ Corregido a "business" (como en store.js)
  );

  const onclickIngreso = () => {
    dispatch(setSeccionStatus(false));
    router.push("/");
  };

  const onclickListado = () => {
    dispatch(setSeccionStatus(true));
    router.push("/");
  };
  const {
    obtenerEstablecimientosHook,
    crearEstablecimientoHook,
    actualizarEstablecimientoHook,
    eliminarEstablecimientoHook,
    toggleEstadoEstablecimientoHook,
    obtenerResumenSaludHook, // ⬅️ AGREGAR ESTO
  } = useBussinesMicroservicio();

  const [activeTab, setActiveTab] = useState("usuarios");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usuarioSeguro, setUsuarioSeguro] = useState(null);
  const [verificando, setVerificando] = useState(true);

  // Estados para modal de usuarios
  const [showModalUsuario, setShowModalUsuario] = useState(false);
  const [modalModeUsuario, setModalModeUsuario] = useState("crear");
  const [selectedUser, setSelectedUser] = useState(null);

  // Estados para modal de establecimientos
  const [showModalEstablecimiento, setShowModalEstablecimiento] =
    useState(false);
  const [modalModeEstablecimiento, setModalModeEstablecimiento] =
    useState("crear");
  const [selectedEstablecimiento, setSelectedEstablecimiento] = useState(null);

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

  // ... otros estados ...

  // 👇 NUEVO: Estado para el formulario de configuración
  const [configData, setConfigData] = useState({
    name: "",
    email: "",
    telefono: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    // Configuración de Business (Alertas)
    umbralMortalidad: 5,
    umbralMorbilidad: 10,
  });

  // 👇 EFECTO: Cargar perfil y Sincronizar Redux
  useEffect(() => {
    const cargarPerfil = async () => {
      const token = getToken();

      if (!token) {
        router.push("/");
        return;
      }

      try {
        // 1. Pedimos datos frescos al Backend (que ya arreglaste)
        const response = await axios.get(`${API_URL}/users/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const usuarioFresco = response.data;
        console.log("✅ Perfil cargado:", usuarioFresco);

        // 2. Guardamos en el estado local (para mostrar este Panel)
        setUsuarioSeguro(usuarioFresco);

        // 3. 👇 ¡LA CLAVE! Actualizamos Redux
        // Esto le grita a toda la app: "¡Oigan, soy ADMIN!"
        dispatch(setUserData(usuarioFresco));

        // Si el usuario tiene establecimiento, lo guardamos también
        if (usuarioFresco.id_establecimiento) {
          dispatch(setEstablecimientoActual(usuarioFresco.id_establecimiento));
        }
      } catch (error) {
        console.error("❌ Error cargando perfil:", error);
        if (error.response?.status === 401) {
          handleLogout();
        }
      } finally {
        // Quitamos el spinner
        setVerificando(false);
      }
    };

    cargarPerfil();
  }, []); // Array vacío = solo corre una vez al entrar
  // 👇 NUEVO: Función para guardar cambios de perfil
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (
      configData.newPassword &&
      configData.newPassword !== configData.confirmPassword
    ) {
      showAlert("Las contraseñas nuevas no coinciden", "error");
      return;
    }

    try {
      const payload = {
        name: configData.name,
        telefono: configData.telefono,
      };

      if (configData.newPassword) {
        payload.password = configData.newPassword;
      }

      // Llamada al MS-SECURITY
      await axios.put(`${API_URL}/users/${userPayload.id}`, payload, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      showAlert(
        "Perfil actualizado correctamente. Por favor vuelve a iniciar sesión.",
        "success",
      );
      // Opcional: handleLogout() si cambió la contraseña
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      showAlert("Error al actualizar el perfil", "error");
    }
  };

  // 👇 NUEVO: Función para guardar reglas de negocio (Simulada por ahora)
  // ✅ VERSIÓN REAL: Conecta con el Backend
  const handleSaveBusinessRules = async (e) => {
    e.preventDefault();

    // Verificamos que haya un establecimiento seleccionado (desde Redux o usuario)
    const idEstablecimiento =
      establecimientoActual?.id_establecimiento ||
      userPayload?.id_establecimiento;

    if (!idEstablecimiento) {
      showAlert(
        "⚠️ No hay un establecimiento seleccionado para configurar",
        "error",
      );
      return;
    }

    try {
      const token = getToken();

      // Preparamos los datos
      const payload = {
        configuracion: {
          umbral_mortalidad: configData.umbralMortalidad,
          umbral_morbilidad: configData.umbralMorbilidad,
        },
      };

      // ✅ CAMBIALO POR ESTO (Apunta directo al 3000):
      await axios.patch(
        `http://localhost:3000/api/business/establecimientos/${idEstablecimiento}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showAlert(
        "✅ Reglas de negocio actualizadas en la base de datos.",
        "success",
      );
    } catch (error) {
      console.error("Error guardando reglas:", error);
      showAlert("❌ Error al conectar con el establecimiento", "error");
    }
  };

  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [datosComparativos, setDatosComparativos] = useState([]); // ⬅️ NUEVO

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
  // 👇 REEMPLAZA TU FUNCIÓN ACTUAL CON ESTA LÓGICA INTELIGENTE
  const abrirModalCrearUsuario = () => {
    setModalModeUsuario("crear");

    // LÓGICA: Si soy Admin de campo, el ID ya viene fijo. Si soy SuperAdmin, viene vacío.
    const idPredefinido =
      userPayload?.rol === "admin" && userPayload?.id_establecimiento
        ? userPayload.id_establecimiento
        : "";

    setFormDataUsuario({
      name: "",
      email: "",
      password: "",
      rol: "operario", // Por defecto creamos operarios
      telefono: "",
      estado: "activo",
      id_establecimiento: idPredefinido, // 👈 ¡Aquí está la magia!
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
        "error",
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
        },
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
        console.log("🏢 Establecimientos cargados:", response.data);
      }
    } catch (error) {
      console.error("Error al cargar establecimientos:", error);
      showAlert("Error al cargar establecimientos", "error");
    } finally {
      setLoading(false);
    }
  };

  // ========== DASHBOARD COMPARATIVO ==========

  const cargarDatosComparativos = async () => {
    try {
      // Obtener resumen para cada establecimiento
      const promesas = establecimientos
        .filter((e) => e.estado === "activo")
        .map(async (est) => {
          const response = await obtenerResumenSaludHook(
            `id_establecimiento=${est.id_establecimiento}`,
          );

          if (response?.status === 200) {
            return {
              id: est.id_establecimiento,
              nombre: est.nombre,
              ubicacion: est.ubicacion,
              totalTerneros: response.data.totalTerneros,
              mortalidad: response.data.porcentajeMortalidad,
              morbilidad: response.data.porcentajeMorbilidad,
              tratamientos: response.data.tratamientosTotal,
              ternerosVivos: response.data.ternerosVivos,
              ternerosMuertos: response.data.ternerosMuertos,
              ternerosEnfermos:
                response.data.ternerosConTratamientos +
                response.data.ternerosConDiarreas,
              sanos:
                response.data.ternerosCompletamenteSanos ||
                response.data.ternerosUnicosSinProblemas,
            };
          }
          return null;
        });

      const resultados = await Promise.all(promesas);
      const datosFiltrados = resultados.filter((d) => d !== null);

      setDatosComparativos(datosFiltrados);
      console.log("📊 Datos comparativos cargados:", datosFiltrados);
    } catch (error) {
      console.error("Error al cargar datos comparativos:", error);
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

  // En AdminPanel.jsx

  const guardarEstablecimiento = async (e) => {
    e.preventDefault();

    if (!formDataEstablecimiento.nombre) {
      showAlert("El nombre es obligatorio", "error");
      return;
    }

    try {
      if (modalModeEstablecimiento === "crear") {
        // 1. PASO A: Creamos el establecimiento en Business
        const response = await crearEstablecimientoHook(
          formDataEstablecimiento,
        );

        // 2. PASO B: ¡MAGIA! ✨ Si se creó bien, nos asignamos como dueños automáticamente
        if (response && response.data && response.data.id_establecimiento) {
          const nuevoIdEstablecimiento = response.data.id_establecimiento;

          // Solo si soy Admin (no SuperAdmin), me auto-asigno
          if (userPayload?.rol === "admin") {
            await axios.post(
              `${API_URL}/users/assign-establishment`,
              {
                userId: userPayload.id,
                establecimientoId: nuevoIdEstablecimiento,
              },
              {
                headers: { Authorization: `Bearer ${getToken()}` },
              },
            );
            console.log("✅ Auto-asignación de dueño completada");
          }
        }

        showAlert("Establecimiento creado y asignado correctamente", "success");
      } else {
        // (Lógica de editar existente...)
        await actualizarEstablecimientoHook(
          selectedEstablecimiento.id_establecimiento,
          formDataEstablecimiento,
        );
        showAlert("Establecimiento actualizado correctamente", "success");
      }

      setShowModalEstablecimiento(false);
      cargarEstablecimientos(); // Refresca la lista y aparecerá el nuevo porque ya es tuyo
    } catch (error) {
      console.error("Error al guardar establecimiento:", error);
      showAlert("Error al guardar establecimiento", "error");
    }
  };

  const eliminarEstablecimiento = async (id) => {
    // Verificar si tiene usuarios asignados
    const usuariosAsignados = users.filter(
      (u) => u.id_establecimiento === id,
    ).length;

    if (usuariosAsignados > 0) {
      if (
        !window.confirm(
          `Este establecimiento tiene ${usuariosAsignados} usuario(s) asignado(s). ¿Estás seguro de desactivarlo? Los usuarios no podrán acceder hasta que se les asigne otro establecimiento.`,
        )
      )
        return;
    } else {
      if (!window.confirm("¿Estás seguro de desactivar este establecimiento?"))
        return;
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

  // ✅ NUEVA FUNCIÓN: Eliminar permanentemente de la BD
  const eliminarEstablecimientoPermanente = async (id, nombre) => {
    // Verificar si tiene usuarios asignados
    const usuariosAsignados = users.filter(
      (u) => u.id_establecimiento === id,
    ).length;

    if (usuariosAsignados > 0) {
      showAlert(
        `❌ No se puede eliminar. Este establecimiento tiene ${usuariosAsignados} usuario(s) asignado(s). Primero reasígnalos o elimínalos.`,
        "error",
      );
      return;
    }

    if (
      !window.confirm(
        `⚠️ ¿Está SEGURO de ELIMINAR PERMANENTEMENTE "${nombre}"?\n\n` +
          `Esta acción NO SE PUEDE DESHACER.\n\n` +
          `Se eliminará de la base de datos junto con todos sus datos relacionados.`,
      )
    ) {
      return;
    }

    try {
      const response = await eliminarEstablecimientoHook(id);

      if (response?.status === 200) {
        showAlert("✅ Establecimiento eliminado permanentemente", "success");
        cargarEstablecimientos();
      } else {
        showAlert("❌ Error al eliminar establecimiento", "error");
      }
    } catch (error) {
      console.error("Error al eliminar establecimiento:", error);
      showAlert(
        error.response?.data?.message || "Error al eliminar establecimiento",
        "error",
      );
    }
  };

  // ========== UTILIDADES ==========

  useEffect(() => {
    const cargarTodo = async () => {
      await cargarUsuarios();
      await cargarEstadisticas();
      await cargarEstablecimientos();
    };

    cargarTodo();
  }, []);

  // ⬅️ NUEVO: Cargar datos comparativos cuando cambien los establecimientos
  useEffect(() => {
    if (establecimientos.length > 0) {
      cargarDatosComparativos();
    }
  }, [establecimientos]);

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

  // 👇 BUSCA ESTA FUNCIÓN EN TU CÓDIGO Y REEMPLÁZALA (Línea aprox 488)
  const getNombreEstablecimiento = (id) => {
    if (!id) return "Sin asignar";

    // Usamos '==' en vez de '===' para que coincida aunque uno sea string ("7") y el otro number (7)
    const est = establecimientos.find((e) => e.id_establecimiento == id);

    // Si lo encuentra, devuelve el nombre. Si no (porque se borró), avisa.
    return est ? est.nombre : `Establecimiento Eliminado (ID: ${id})`;
  };
  const contarUsuariosPorEstablecimiento = (id) => {
    return users.filter((u) => u.id_establecimiento === id).length;
  };

  // Estadísticas de establecimientos
  const statsEstablecimientos = {
    total: establecimientos.length,
    activos: establecimientos.filter((e) => e.estado === "activo").length,
    inactivos: establecimientos.filter((e) => e.estado === "inactivo").length,
  };

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(format(new Date(), "yyyy-MM-dd HH:mm:ss"));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // ========== FUNCIONES AUXILIARES DASHBOARD ==========

  const getColorMortalidad = (valor) => {
    if (valor === 0) return "text-green-600";
    if (valor <= 5) return "text-yellow-600";
    if (valor <= 10) return "text-orange-600";
    return "text-red-600";
  };

  const getColorMorbilidad = (valor) => {
    if (valor <= 10) return "text-green-600";
    if (valor <= 20) return "text-yellow-600";
    if (valor <= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getBgColorMortalidad = (valor) => {
    if (valor === 0) return "bg-green-500";
    if (valor <= 5) return "bg-yellow-500";
    if (valor <= 10) return "bg-orange-500";
    return "bg-red-500";
  };

  const getBgColorMorbilidad = (valor) => {
    if (valor <= 10) return "bg-green-500";
    if (valor <= 20) return "bg-yellow-500";
    if (valor <= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const idEstablecimientoFinal =
    establecimientoActual?.id_establecimiento ||
    userPayload?.id_establecimiento;

  // 👇 PEGA ESTO ANTES DEL RETURN (por ejemplo, debajo de onclickListado)
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token"); // Borra la llave de acceso
    }
    router.push("/"); // Te manda al Login
  };

  // 👇 NUEVO BLOQUE: Si no sabemos quién eres, mostramos cargando
  if (!usuarioSeguro?.id) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500'></div>
        <p className='mt-4 text-gray-600 font-semibold'>
          Verificando credenciales...
        </p>
      </div>
    );
  }

  if (verificando) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500'></div>
        <p className='mt-4 text-gray-600 font-semibold'>
          Verificando credenciales...
        </p>
      </div>
    );
  }

  // Si terminó de verificar y aún así no hay usuario, es un error o logout
  if (!usuarioSeguro?.id) {
    return null; // O podrías redirigir a login aquí también
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 mt-16'>
      {/* Navbar Verde */}
      <nav className='fixed top-0 left-0 right-0 flex justify-between items-center bg-green-400 text-white px-24 py-3 z-50'>
        {/* Lado izquierdo: Botones de navegación */}
        <div className='flex gap-4'>
          <button
            onClick={onclickIngreso}
            className='text-x font-bold flex items-center hover:text-green-700 transition-colors'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={1.5}
              stroke='currentColor'
              className='size-6 mr-2'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
              />
            </svg>
            Ingresos
          </button>

          <button
            onClick={onclickListado}
            className='text-x font-bold flex items-center hover:text-green-700 transition-colors'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={1.5}
              stroke='currentColor'
              className='size-6 mr-2'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z'
              />
            </svg>
            Listados
          </button>
        </div>

        {/* Lado derecho: Badges, hora y usuario */}
        <ul className='flex gap-x-4 items-center'>
          {/* Badge del establecimiento */}
          <li>
            <EstablecimientoBadge />
          </li>

          {/* Selector de establecimiento */}
          <li>
            <EstablecimientoSelector />
          </li>

          {/* Hora UTC */}
          <li className='text-sm font-semibold'>{currentTime} UTC</li>

          {/* Nombre del usuario */}
          <li>
            <h1 className='text-white font-semibold'>{usuarioSeguro?.name}</h1>
          </li>

          {/* 👇 AGREGA ESTE <li> CON EL BOTÓN AQUÍ AL FINAL */}
          <li>
            <button
              onClick={handleLogout}
              className='bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm border-2 border-red-400 flex items-center gap-2'
              title='Cerrar Sesión'
            >
              🚪 Salir
            </button>
          </li>
        </ul>
      </nav>
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
                <div className='text-sm text-gray-600 mb-1'>
                  Usuarios Activos
                </div>
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
                <div className='text-sm text-gray-600 mb-1'>
                  Establecimientos
                </div>
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
          {/* ⬅️ NUEVO TAB */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "dashboard"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            📊 Dashboard Comparativo
          </button>

          {/* 🟢 PEGALO AQUÍ, ANTES O DESPUÉS DE CONFIGURACIÓN */}
          <button
            onClick={() => setActiveTab("equipo")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "equipo"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            🚜 Equipo
          </button>

          {/* 👇 MODIFICACIÓN: Solo mostrar si es Admin o SuperAdmin */}
          {(usuarioSeguro?.rol === "admin" ||
            usuarioSeguro?.rol === "super_admin") && (
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
          )}
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
                      Establecimiento
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-600'>
                      Teléfono
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
                            user.rol,
                          )} flex items-center gap-1 w-fit`}
                        >
                          {getRolIcon(user.rol)} {user.rol}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <button
                          onClick={() => toggleEstadoUsuario(user.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(
                            user.estado,
                          )} hover:opacity-80 transition-opacity cursor-pointer`}
                        >
                          {user.estado}
                        </button>
                      </td>
                      <td className='px-4 py-3 text-sm'>
                        <span
                          className={
                            user.id_establecimiento
                              ? "text-gray-700"
                              : "text-red-500 italic"
                          }
                        >
                          🏢 {getNombreEstablecimiento(user.id_establecimiento)}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-sm'>
                        {user.telefono || "-"}
                      </td>
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
                Total: {statsEstablecimientos.total} | Activos:{" "}
                {statsEstablecimientos.activos} | Inactivos:{" "}
                {statsEstablecimientos.inactivos}
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
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(
                          est.estado,
                        )}`}
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
                        {contarUsuariosPorEstablecimiento(
                          est.id_establecimiento,
                        )}{" "}
                        usuario(s)
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
                    {/* Botón Editar */}
                    <button
                      onClick={() => abrirModalEditarEstablecimiento(est)}
                      className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-sm font-medium'
                      title='Editar información del establecimiento'
                    >
                      ✏️ Editar
                    </button>

                    {/* Botón Toggle Activar/Desactivar */}
                    <button
                      onClick={() =>
                        eliminarEstablecimiento(est.id_establecimiento)
                      }
                      className={`flex-1 ${
                        est.estado === "activo"
                          ? "bg-yellow-600 hover:bg-yellow-700"
                          : "bg-green-600 hover:bg-green-700"
                      } text-white py-2 rounded-lg transition-colors text-sm font-medium`}
                      title={
                        est.estado === "activo"
                          ? "Desactivar temporalmente"
                          : "Reactivar"
                      }
                    >
                      {est.estado === "activo" ? "⏸️ Desactivar" : "▶️ Activar"}
                    </button>

                    {/* ✅ NUEVO: Botón Eliminar Permanente */}
                    <button
                      onClick={() =>
                        eliminarEstablecimientoPermanente(
                          est.id_establecimiento,
                          est.nombre,
                        )
                      }
                      className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors text-sm font-medium'
                      title='Eliminar permanentemente de la base de datos'
                    >
                      🗑️ Eliminar
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
                onClick={abrirModalCrearEstablecimiento}
                className='mt-4 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2'
              >
                <span>➕</span>
                Crear Primer Establecimiento
              </button>
            </div>
          )}
        </div>
      )}
      {/* TAB: DASHBOARD COMPARATIVO */}
      {activeTab === "dashboard" && (
        <div className='space-y-6'>
          {/* Header */}
          <div className='bg-white rounded-lg shadow-md p-6'>
            <div className='flex justify-between items-center mb-4'>
              <div>
                <h2 className='text-2xl font-bold text-gray-800'>
                  📊 Dashboard Comparativo
                </h2>
                <p className='text-sm text-gray-500 mt-1'>
                  Comparación de métricas clave entre establecimientos activos
                </p>
              </div>
              <button
                onClick={cargarDatosComparativos}
                className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2'
              >
                <span>🔄</span>
                Actualizar
              </button>
            </div>

            {datosComparativos.length === 0 ? (
              <div className='text-center py-12'>
                <div className='text-6xl mb-4'>📊</div>
                <p className='text-gray-500 text-lg'>
                  No hay datos disponibles. Asegúrate de tener establecimientos
                  activos con terneros registrados.
                </p>
              </div>
            ) : (
              <>
                {/* Resumen General */}
                <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
                  <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-500'>
                    <div className='text-sm text-blue-600 font-semibold mb-1'>
                      Total Terneros
                    </div>
                    <div className='text-3xl font-bold text-blue-700'>
                      {datosComparativos.reduce(
                        (sum, d) => sum + d.totalTerneros,
                        0,
                      )}
                    </div>
                  </div>
                  <div className='bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-500'>
                    <div className='text-sm text-green-600 font-semibold mb-1'>
                      Terneros Vivos
                    </div>
                    <div className='text-3xl font-bold text-green-700'>
                      {datosComparativos.reduce(
                        (sum, d) => sum + d.ternerosVivos,
                        0,
                      )}
                    </div>
                  </div>
                  <div className='bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-l-4 border-red-500'>
                    <div className='text-sm text-red-600 font-semibold mb-1'>
                      Mortalidad Promedio
                    </div>
                    <div className='text-3xl font-bold text-red-700'>
                      {datosComparativos.length > 0
                        ? (
                            datosComparativos.reduce(
                              (sum, d) => sum + d.mortalidad,
                              0,
                            ) / datosComparativos.length
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                  <div className='bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-500'>
                    <div className='text-sm text-orange-600 font-semibold mb-1'>
                      Total Tratamientos
                    </div>
                    <div className='text-3xl font-bold text-orange-700'>
                      {datosComparativos.reduce(
                        (sum, d) => sum + d.tratamientos,
                        0,
                      )}
                    </div>
                  </div>
                </div>

                {/* Comparación por Establecimiento - Cards */}
                <div>
                  <h3 className='text-lg font-bold text-gray-800 mb-4'>
                    Comparación por Establecimiento
                  </h3>
                  <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
                    {datosComparativos.map((dato) => (
                      <div
                        key={dato.id}
                        className='bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-xl transition-all hover:border-blue-300'
                      >
                        {/* Header del Card */}
                        <div className='mb-4 pb-4 border-b-2 border-gray-100'>
                          <h4 className='text-xl font-bold text-gray-800 mb-1'>
                            🏢 {dato.nombre}
                          </h4>
                          <p className='text-sm text-gray-500'>
                            📍 {dato.ubicacion}
                          </p>
                        </div>

                        {/* Métricas Principales */}
                        <div className='space-y-3'>
                          {/* Total Terneros */}
                          <div className='flex justify-between items-center'>
                            <span className='text-sm font-medium text-gray-600'>
                              🐄 Total Terneros
                            </span>
                            <span className='text-lg font-bold text-blue-600'>
                              {dato.totalTerneros}
                            </span>
                          </div>

                          {/* Mortalidad */}
                          <div className='flex justify-between items-center'>
                            <span className='text-sm font-medium text-gray-600'>
                              💀 Mortalidad
                            </span>
                            <span
                              className={`text-lg font-bold ${getColorMortalidad(
                                dato.mortalidad,
                              )}`}
                            >
                              {dato.mortalidad}%
                            </span>
                          </div>

                          {/* Barra de Mortalidad */}
                          <div className='w-full bg-gray-200 rounded-full h-2'>
                            <div
                              className={`h-2 rounded-full ${getBgColorMortalidad(
                                dato.mortalidad,
                              )}`}
                              style={{
                                width: `${Math.min(
                                  dato.mortalidad * 10,
                                  100,
                                )}%`,
                              }}
                            ></div>
                          </div>

                          {/* Morbilidad */}
                          <div className='flex justify-between items-center mt-3'>
                            <span className='text-sm font-medium text-gray-600'>
                              🤒 Morbilidad
                            </span>
                            <span
                              className={`text-lg font-bold ${getColorMorbilidad(
                                dato.morbilidad,
                              )}`}
                            >
                              {dato.morbilidad}%
                            </span>
                          </div>

                          {/* Barra de Morbilidad */}
                          <div className='w-full bg-gray-200 rounded-full h-2'>
                            <div
                              className={`h-2 rounded-full ${getBgColorMorbilidad(
                                dato.morbilidad,
                              )}`}
                              style={{
                                width: `${Math.min(
                                  dato.morbilidad * 2.5,
                                  100,
                                )}%`,
                              }}
                            ></div>
                          </div>

                          {/* Tratamientos */}
                          <div className='flex justify-between items-center mt-3'>
                            <span className='text-sm font-medium text-gray-600'>
                              💊 Tratamientos
                            </span>
                            <span className='text-lg font-bold text-purple-600'>
                              {dato.tratamientos}
                            </span>
                          </div>

                          {/* Distribución */}
                          <div className='mt-4 pt-4 border-t-2 border-gray-100'>
                            <div className='grid grid-cols-3 gap-2 text-center'>
                              <div className='bg-green-50 rounded p-2'>
                                <div className='text-xs text-green-600 font-semibold'>
                                  Sanos
                                </div>
                                <div className='text-lg font-bold text-green-700'>
                                  {dato.sanos}
                                </div>
                              </div>
                              <div className='bg-yellow-50 rounded p-2'>
                                <div className='text-xs text-yellow-600 font-semibold'>
                                  Enfermos
                                </div>
                                <div className='text-lg font-bold text-yellow-700'>
                                  {dato.ternerosEnfermos}
                                </div>
                              </div>
                              <div className='bg-red-50 rounded p-2'>
                                <div className='text-xs text-red-600 font-semibold'>
                                  Muertos
                                </div>
                                <div className='text-lg font-bold text-red-700'>
                                  {dato.ternerosMuertos}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ranking de Establecimientos */}
                <div className='mt-6'>
                  <h3 className='text-lg font-bold text-gray-800 mb-4'>
                    🏆 Ranking de Establecimientos
                  </h3>
                  <div className='bg-white rounded-lg shadow-md overflow-hidden'>
                    <table className='w-full'>
                      <thead className='bg-gradient-to-r from-blue-500 to-purple-500 text-white'>
                        <tr>
                          <th className='px-4 py-3 text-left text-sm font-semibold'>
                            Posición
                          </th>
                          <th className='px-4 py-3 text-left text-sm font-semibold'>
                            Establecimiento
                          </th>
                          <th className='px-4 py-3 text-center text-sm font-semibold'>
                            Terneros
                          </th>
                          <th className='px-4 py-3 text-center text-sm font-semibold'>
                            Mortalidad
                          </th>
                          <th className='px-4 py-3 text-center text-sm font-semibold'>
                            Morbilidad
                          </th>
                          <th className='px-4 py-3 text-center text-sm font-semibold'>
                            Performance
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200'>
                        {[...datosComparativos]
                          .sort((a, b) => {
                            // Ordenar por: menor mortalidad, menor morbilidad, más terneros
                            const scoreA =
                              100 -
                              a.mortalidad +
                              (100 - a.morbilidad) +
                              a.totalTerneros / 10;
                            const scoreB =
                              100 -
                              b.mortalidad +
                              (100 - b.morbilidad) +
                              b.totalTerneros / 10;
                            return scoreB - scoreA;
                          })
                          .map((dato, index) => (
                            <tr
                              key={dato.id}
                              className='hover:bg-gray-50 transition-colors'
                            >
                              <td className='px-4 py-3 text-center'>
                                <span className='text-2xl'>
                                  {index === 0
                                    ? "🥇"
                                    : index === 1
                                      ? "🥈"
                                      : index === 2
                                        ? "🥉"
                                        : `${index + 1}º`}
                                </span>
                              </td>
                              <td className='px-4 py-3'>
                                <div>
                                  <div className='font-semibold text-gray-800'>
                                    {dato.nombre}
                                  </div>
                                  <div className='text-xs text-gray-500'>
                                    {dato.ubicacion}
                                  </div>
                                </div>
                              </td>
                              <td className='px-4 py-3 text-center font-bold text-blue-600'>
                                {dato.totalTerneros}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                <span
                                  className={`font-bold ${getColorMortalidad(
                                    dato.mortalidad,
                                  )}`}
                                >
                                  {dato.mortalidad}%
                                </span>
                              </td>
                              <td className='px-4 py-3 text-center'>
                                <span
                                  className={`font-bold ${getColorMorbilidad(
                                    dato.morbilidad,
                                  )}`}
                                >
                                  {dato.morbilidad}%
                                </span>
                              </td>
                              <td className='px-4 py-3 text-center'>
                                {dato.mortalidad === 0 &&
                                dato.morbilidad < 10 ? (
                                  <span className='bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold'>
                                    ⭐ Excelente
                                  </span>
                                ) : dato.mortalidad <= 5 &&
                                  dato.morbilidad <= 20 ? (
                                  <span className='bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold'>
                                    👍 Bueno
                                  </span>
                                ) : dato.mortalidad <= 10 &&
                                  dato.morbilidad <= 40 ? (
                                  <span className='bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold'>
                                    ⚠️ Regular
                                  </span>
                                ) : (
                                  <span className='bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold'>
                                    🚨 Atención
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {activeTab === "equipo" && (
        <div className='space-y-6'>
          {/* 👇 USAMOS LA VARIABLE CALCULADA "idEstablecimientoFinal" */}
          {idEstablecimientoFinal ? (
            <TeamManager establecimientoId={idEstablecimientoFinal} />
          ) : (
            <div className='bg-yellow-50 p-6 rounded-lg text-center border border-yellow-200'>
              <h3 className='text-lg font-bold text-yellow-800'>
                ⚠️ Sin establecimiento seleccionado
              </h3>
              <p className='text-yellow-700'>
                Selecciona un establecimiento o asegúrate de tener uno asignado
                para gestionar el equipo.
              </p>
            </div>
          )}
        </div>
      )}
      {/* TAB: CONFIGURACIÓN */}

      {activeTab === "configuracion" &&
        (usuarioSeguro?.rol === "admin" ||
          usuarioSeguro?.rol === "super_admin") && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* ... contenido ... */}
            <>
              {/* TARJETA 1: PERFIL DEL ADMINISTRADOR */}
              <div className='bg-white rounded-lg shadow-md p-6'>
                <h3 className='text-xl font-bold text-gray-800 mb-4 border-b pb-2'>
                  👤 Mi Perfil
                </h3>
                <form onSubmit={handleUpdateProfile}>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Nombre
                      </label>
                      <input
                        type='text'
                        value={configData.name || usuarioSeguro?.name || ""}
                        onChange={(e) =>
                          setConfigData({ ...configData, name: e.target.value })
                        }
                        className='w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Email
                      </label>
                      <input
                        type='email'
                        value={usuarioSeguro?.email || ""}
                        disabled
                        className='w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Teléfono
                      </label>
                      <input
                        type='tel'
                        value={
                          configData.telefono || usuarioSeguro?.telefono || ""
                        }
                        onChange={(e) =>
                          setConfigData({
                            ...configData,
                            telefono: e.target.value,
                          })
                        }
                        className='w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none'
                      />
                    </div>

                    <hr className='my-4' />
                    <h4 className='font-semibold text-gray-700'>
                      Cambiar Contraseña
                    </h4>

                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Nueva Contraseña
                      </label>
                      <input
                        type='password'
                        value={configData.newPassword}
                        onChange={(e) =>
                          setConfigData({
                            ...configData,
                            newPassword: e.target.value,
                          })
                        }
                        className='w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none'
                        placeholder='Dejar vacío para mantener la actual'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Confirmar Contraseña
                      </label>
                      <input
                        type='password'
                        value={configData.confirmPassword}
                        onChange={(e) =>
                          setConfigData({
                            ...configData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className='w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none'
                      />
                    </div>
                  </div>
                  <button
                    type='submit'
                    className='mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors'
                  >
                    💾 Guardar Cambios de Perfil
                  </button>
                </form>
              </div>

              {/* TARJETA 2: REGLAS DE NEGOCIO (Alertas) */}
              <div className='bg-white rounded-lg shadow-md p-6'>
                <h3 className='text-xl font-bold text-gray-800 mb-4 border-b pb-2'>
                  ⚙️ Configuración del Sistema
                </h3>
                <p className='text-sm text-gray-500 mb-4'>
                  Define los umbrales para las alertas automáticas en el
                  dashboard.
                </p>
                <form onSubmit={handleSaveBusinessRules}>
                  <div className='space-y-6'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Umbral de Mortalidad Crítica (%)
                      </label>
                      <div className='flex items-center gap-4'>
                        <input
                          type='range'
                          min='1'
                          max='20'
                          value={configData.umbralMortalidad}
                          onChange={(e) =>
                            setConfigData({
                              ...configData,
                              umbralMortalidad: parseInt(e.target.value),
                            })
                          }
                          className='w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer'
                        />
                        <span className='font-bold text-red-600 w-12'>
                          {configData.umbralMortalidad}%
                        </span>
                      </div>
                      <p className='text-xs text-gray-500 mt-1'>
                        Si la mortalidad supera este valor, el indicador se
                        pondrá rojo.
                      </p>
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Umbral de Morbilidad (Enfermedad) (%)
                      </label>
                      <div className='flex items-center gap-4'>
                        <input
                          type='range'
                          min='5'
                          max='50'
                          value={configData.umbralMorbilidad}
                          onChange={(e) =>
                            setConfigData({
                              ...configData,
                              umbralMorbilidad: parseInt(e.target.value),
                            })
                          }
                          className='w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer'
                        />
                        <span className='font-bold text-orange-600 w-12'>
                          {configData.umbralMorbilidad}%
                        </span>
                      </div>
                      <p className='text-xs text-gray-500 mt-1'>
                        Porcentaje máximo aceptable de terneros enfermos.
                      </p>
                    </div>
                  </div>
                  <button
                    type='submit'
                    className='mt-8 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors'
                  >
                    🛠️ Actualizar Reglas de Negocio
                  </button>
                </form>
              </div>
            </>
          </div>
        )}
      {/* MODAL: CREAR/EDITAR USUARIO */}
      {showModalUsuario && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto'>
            <h3 className='text-2xl font-bold mb-6 text-gray-800'>
              {modalModeUsuario === "crear"
                ? "➕ Crear Usuario"
                : "✏️ Editar Usuario"}
            </h3>

            <form onSubmit={guardarUsuario}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Nombre <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formDataUsuario.name}
                    onChange={(e) =>
                      setFormDataUsuario({
                        ...formDataUsuario,
                        name: e.target.value,
                      })
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
                    value={formDataUsuario.email}
                    onChange={(e) =>
                      setFormDataUsuario({
                        ...formDataUsuario,
                        email: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    required
                    placeholder='juan@ejemplo.com'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Contraseña{" "}
                    {modalModeUsuario === "editar" &&
                      "(dejar vacío para no cambiar)"}
                    {modalModeUsuario === "crear" && (
                      <span className='text-red-500'>*</span>
                    )}
                  </label>
                  <input
                    type='password'
                    value={formDataUsuario.password}
                    onChange={(e) =>
                      setFormDataUsuario({
                        ...formDataUsuario,
                        password: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    required={modalModeUsuario === "crear"}
                    placeholder='Mínimo 6 caracteres'
                    minLength={6}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Rol
                  </label>
                  <select
                    value={formDataUsuario.rol}
                    onChange={(e) =>
                      setFormDataUsuario({
                        ...formDataUsuario,
                        rol: e.target.value,
                      })
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
                    🏢 Establecimiento
                  </label>
                  <select
                    value={formDataUsuario.id_establecimiento}
                    onChange={(e) =>
                      setFormDataUsuario({
                        ...formDataUsuario,
                        id_establecimiento: e.target.value,
                      })
                    }
                    // 👇 BLOQUEAR SI: No es Super Admin (así no pueden cambiar su propia granja)
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      // Le damos un toque gris visual si está bloqueado
                      userPayload?.rol === "admin"
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <option value=''>Sin asignar</option>
                    {establecimientos
                      .filter((e) => e.estado === "activo")
                      .map((est) => (
                        <option
                          key={est.id_establecimiento}
                          value={est.id_establecimiento}
                        >
                          {est.nombre} - {est.ubicacion}
                        </option>
                      ))}
                  </select>
                  <p className='text-xs text-gray-500 mt-1'>
                    Los usuarios sin establecimiento no podrán acceder al
                    sistema
                  </p>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Teléfono
                  </label>
                  <input
                    type='tel'
                    value={formDataUsuario.telefono}
                    onChange={(e) =>
                      setFormDataUsuario({
                        ...formDataUsuario,
                        telefono: e.target.value,
                      })
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
                    value={formDataUsuario.estado}
                    onChange={(e) =>
                      setFormDataUsuario({
                        ...formDataUsuario,
                        estado: e.target.value,
                      })
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
                  onClick={() => setShowModalUsuario(false)}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors'
                >
                  {modalModeUsuario === "crear" ? "➕ Crear" : "💾 Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: CREAR/EDITAR ESTABLECIMIENTO */}
      {showModalEstablecimiento && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto'>
            <h3 className='text-2xl font-bold mb-6 text-gray-800'>
              {modalModeEstablecimiento === "crear"
                ? "➕ Crear Establecimiento"
                : "✏️ Editar Establecimiento"}
            </h3>

            <form onSubmit={guardarEstablecimiento}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Nombre del Establecimiento{" "}
                    <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formDataEstablecimiento.nombre}
                    onChange={(e) =>
                      setFormDataEstablecimiento({
                        ...formDataEstablecimiento,
                        nombre: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                    required
                    placeholder='Estancia La Esperanza'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    📍 Ubicación
                  </label>
                  <input
                    type='text'
                    value={formDataEstablecimiento.ubicacion}
                    onChange={(e) =>
                      setFormDataEstablecimiento({
                        ...formDataEstablecimiento,
                        ubicacion: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                    placeholder='Ruta 14, Km 87'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    📞 Teléfono
                  </label>
                  <input
                    type='tel'
                    value={formDataEstablecimiento.telefono}
                    onChange={(e) =>
                      setFormDataEstablecimiento({
                        ...formDataEstablecimiento,
                        telefono: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                    placeholder='+54 379 4555666'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    👤 Responsable
                  </label>
                  <input
                    type='text'
                    value={formDataEstablecimiento.responsable}
                    onChange={(e) =>
                      setFormDataEstablecimiento({
                        ...formDataEstablecimiento,
                        responsable: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                    placeholder='Roberto Martínez'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    📝 Notas
                  </label>
                  <textarea
                    value={formDataEstablecimiento.notas}
                    onChange={(e) =>
                      setFormDataEstablecimiento({
                        ...formDataEstablecimiento,
                        notas: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                    rows='3'
                    placeholder='Información adicional...'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Estado
                  </label>
                  <select
                    value={formDataEstablecimiento.estado}
                    onChange={(e) =>
                      setFormDataEstablecimiento({
                        ...formDataEstablecimiento,
                        estado: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                  >
                    <option value='activo'>✅ Activo</option>
                    <option value='inactivo'>❌ Inactivo</option>
                  </select>
                </div>
              </div>

              <div className='flex gap-3 mt-6'>
                <button
                  type='button'
                  onClick={() => setShowModalEstablecimiento(false)}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  className='flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors'
                >
                  {modalModeEstablecimiento === "crear"
                    ? "➕ Crear"
                    : "💾 Guardar"}
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
