import businessApi from "@/api/bussines-api";
import logAuthMethod from "@/utils/logAuth";
import sessionLogOutMethod from "@/utils/sessionLogOut";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";

export const useBussinesMicroservicio = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  //seccion MADRE
  const crearMadreHook = async (objectMadre) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(`/madres/crear-madre`, objectMadre);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  const obtenerMadreHook = async (queryParams = "") => {
    try {
      const url = queryParams
        ? `/madres/obtener-listado-madres?${queryParams}`
        : `/madres/obtener-listado-madres`;

      const { data, config, headers, status, statusText, request } =
        await businessApi.get(url);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  //seccion TERNERO
  const crearTerneroHook = async (objectTernero) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(`/terneros/crear-ternero`, objectTernero);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  const obtenerTerneroHook = async (queryParams = "") => {
    try {
      // Construir la URL con query parameters si existen
      const url = queryParams
        ? `/terneros/obtener-listado-terneros?${queryParams}`
        : `/terneros/obtener-listado-terneros`;

      const { data, config, headers, status, statusText, request } =
        await businessApi.get(url);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  // NUEVO: Agregar peso diario del ternero
  const agregarPesoDiarioHook = async (id_ternero, pesoData) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(`/terneros/peso-diario/${id_ternero}`, pesoData);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  // NUEVO: Obtener historial completo de pesos
  const obtenerHistorialCompletoHook = async (id_ternero) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/terneros/historial-completo/${id_ternero}`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  //seccion EVENTO
  const crearEventoHook = async (objectEvento) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(`/eventos/crear-evento`, objectEvento);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  // NUEVO: Hook para múltiples eventos
  const crearMultiplesEventosHook = async (objectMultiplesEventos) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(
          `/eventos/crear-multiples-eventos`,
          objectMultiplesEventos
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  const obtenerEventoHook = async (queryParams = "") => {
    try {
      const url = queryParams
        ? `/eventos/obtener-listado-eventos?${queryParams}`
        : `/eventos/obtener-listado-eventos`;

      const { data, config, headers, status, statusText, request } =
        await businessApi.get(url);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  //seccion TRATAMIENTO
  const crearTratamientoHook = async (objectTratamiento) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(
          `/tratamientos/crear-tratamiento`,
          objectTratamiento
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  // NUEVO: Crear múltiples tratamientos
  const crearMultiplesTratamientosHook = async (
    objectMultiplesTratamientos
  ) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(
          `/tratamientos/crear-multiples-tratamientos`,
          objectMultiplesTratamientos
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  // Método actualizado para soportar filtros
  const obtenerTratamientoHook = async (queryParams = "") => {
    try {
      // Construir la URL con query parameters si existen
      const url = queryParams
        ? `/tratamientos/obtener-listado-tratamientos?${queryParams}`
        : `/tratamientos/obtener-listado-tratamientos`;

      const { data, config, headers, status, statusText, request } =
        await businessApi.get(url);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  // Métodos para endpoints específicos de filtrado
  const obtenerTratamientosPorTipoHook = async (tipoEnfermedad) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(
          `/tratamientos/obtener-tratamientos-por-enfermedad/${tipoEnfermedad}`
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  const obtenerTratamientosPorTurnoHook = async (turno) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(
          `/tratamientos/obtener-tratamientos-por-turno/${turno}`
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  const obtenerTratamientosPorTipoYTurnoHook = async (
    tipoEnfermedad,
    turno
  ) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(
          `/tratamientos/obtener-tratamientos-por-enfermedad-y-turno/${tipoEnfermedad}/${turno}`
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  //seccion TRATAMIENTO TERNERO
  const crearTratamientoTerneroHook = async (objectTratamiento) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(
          `/terneros-tratamientos/crear-tratamiento-ternero`,
          objectTratamiento
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  const obtenerTratamientoTerneroHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(
          `/terneros-tratamientos/obtener-listado-tratamientos-terneros`
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  // ✅ DESPUÉS (solo logout en 401)
  const crearDiarreTerneroHook = async (objectTratamiento) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(
          `/diarrea-terneros/crear-diarrea-ternero`,
          objectTratamiento
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      console.error(
        "❌ Error en crearDiarreTerneroHook:",
        error.response?.status
      );

      // Solo hacer logout si el token es inválido (401)
      if (error.response?.status === 401) {
        sessionLogOutMethod(dispatch);
        logAuthMethod(dispatch, router);
      }

      // ✅ Devolver objeto con el error
      return {
        status: error.response?.status,
        data: error.response?.data,
        error: true,
      };
    }
  };
  const obtenerDiarreaTerneroHook = async (queryParams = "") => {
    try {
      const url = queryParams
        ? `/diarrea-terneros/obtener-listado-diarrea-terneros?${queryParams}`
        : `/diarrea-terneros/obtener-listado-diarrea-terneros`;

      const { data, config, headers, status, statusText, request } =
        await businessApi.get(url);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  const actualizarCalostradoHook = async (id_ternero, calostradoData) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.patch(
          `/terneros/calostrado/${id_ternero}`,
          calostradoData
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const obtenerResumenSaludHook = async (queryParams = "") => {
    // ⬅️ AGREGAR PARÁMETRO
    try {
      const url = queryParams
        ? `/resumen-salud?${queryParams}`
        : `/resumen-salud`;

      console.log("🔍 Hook obtenerResumenSaludHook - URL:", url);

      const { data, config, headers, status, statusText, request } =
        await businessApi.get(url);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  // ===== SECCIÓN USERS ADMIN =====
  const obtenerUsuariosHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/users`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const obtenerEstadisticasUsuariosHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/users/stats`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const crearUsuarioHook = async (userData) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(`/users`, userData);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const actualizarUsuarioHook = async (id, userData) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.put(`/users/${id}`, userData);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const eliminarUsuarioHook = async (id) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.delete(`/users/${id}`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const toggleEstadoUsuarioHook = async (id) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.put(`/users/${id}/toggle-status`, {});
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  // ===== ESTABLECIMIENTOS =====
  const obtenerEstablecimientosHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/establecimientos`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const crearEstablecimientoHook = async (dataEstablecimiento) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(`/establecimientos`, dataEstablecimiento);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const actualizarEstablecimientoHook = async (id, dataEstablecimiento) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.put(`/establecimientos/${id}`, dataEstablecimiento);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const eliminarEstablecimientoHook = async (id) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.delete(`/establecimientos/${id}`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  const toggleEstadoEstablecimientoHook = async (id) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.patch(`/establecimientos/${id}/toggle-estado`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  // ⬅️ NUEVA FUNCIÓN: Obtener usuarios pendientes
  const obtenerUsuariosPendientesHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/users`, {
          params: { estado: "pendiente" },
        });
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  sessionLogOutMethod(dispatch);

  // ===== RODEOS =====
  const obtenerRodeosHook = async (queryParams = "") => {
    try {
      const url = queryParams
        ? `/rodeos/obtener-listado?${queryParams}`
        : `/rodeos/obtener-listado`;
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(url);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      if (error.response?.status === 401) {
        sessionLogOutMethod(dispatch);
        logAuthMethod(dispatch, router);
      }
      return {
        status: error.response?.status,
        data: error.response?.data,
        error: true,
      };
    }
  };

  const crearRodeoHook = async (dataRodeo) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(`/rodeos`, dataRodeo);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      if (error.response?.status === 401) {
        sessionLogOutMethod(dispatch);
        logAuthMethod(dispatch, router);
      }
      return {
        status: error.response?.status,
        data: error.response?.data,
        error: true,
      };
    }
  };

  const actualizarRodeoHook = async (id, dataRodeo) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.put(`/rodeos/${id}`, dataRodeo);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      if (error.response?.status === 401) {
        sessionLogOutMethod(dispatch);
        logAuthMethod(dispatch, router);
      }
      return {
        status: error.response?.status,
        data: error.response?.data,
        error: true,
      };
    }
  };

  const toggleEstadoRodeoHook = async (id) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.patch(`/rodeos/${id}/toggle-estado`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      if (error.response?.status === 401) {
        sessionLogOutMethod(dispatch);
        logAuthMethod(dispatch, router);
      }
      return {
        status: error.response?.status,
        data: error.response?.data,
        error: true,
      };
    }
  };

  const obtenerEstadisticasRodeoHook = async (id, queryParams = "") => {
    try {
      const url = queryParams
        ? `/rodeos/${id}/estadisticas?${queryParams}`
        : `/rodeos/${id}/estadisticas`;
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(url);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      console.error(
        "❌ Error en obtenerEstadisticasRodeoHook:",
        error.response?.status
      );

      // ✅ Solo logout en 401
      if (error.response?.status === 401) {
        sessionLogOutMethod(dispatch);
        logAuthMethod(dispatch, router);
      }

      // ✅ Devolver objeto con el error
      return {
        status: error.response?.status,
        data: error.response?.data,
        error: true,
      };
    }
  };

  return {
    //seccion MADRES
    crearMadreHook,
    obtenerMadreHook,
    //seccion TERNERO
    crearTerneroHook,
    obtenerTerneroHook,
    // NUEVO: Peso diario
    agregarPesoDiarioHook,
    obtenerHistorialCompletoHook,
    //seccion EVENTO
    crearEventoHook,
    crearMultiplesEventosHook,
    obtenerEventoHook,
    //seccion TRATAMIENTO
    crearTratamientoHook,
    crearMultiplesTratamientosHook,
    obtenerTratamientoHook,
    obtenerTratamientosPorTipoHook,
    obtenerTratamientosPorTurnoHook,
    obtenerTratamientosPorTipoYTurnoHook,
    // seccion TRATAMIENTO TERNERO
    crearTratamientoTerneroHook,
    obtenerTratamientoTerneroHook,
    // seccion DIARREA TERNERO
    crearDiarreTerneroHook,
    obtenerDiarreaTerneroHook,
    actualizarCalostradoHook,
    obtenerResumenSaludHook,
    // ===== USERS ADMIN =====
    obtenerUsuariosHook,
    obtenerEstadisticasUsuariosHook,
    crearUsuarioHook,
    actualizarUsuarioHook,
    eliminarUsuarioHook,
    toggleEstadoUsuarioHook,
    obtenerEstablecimientosHook,
    crearEstablecimientoHook,
    actualizarEstablecimientoHook,
    eliminarEstablecimientoHook,
    toggleEstadoEstablecimientoHook,
    obtenerUsuariosPendientesHook, // <- Agregar aquí el nuevo hook
    obtenerRodeosHook,
    crearRodeoHook,
    actualizarRodeoHook,
    toggleEstadoRodeoHook,
    obtenerEstadisticasRodeoHook,
  };
};
