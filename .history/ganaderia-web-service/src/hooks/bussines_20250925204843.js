import businessApi from "@/api/bussines-api";
import logAuthMethod from "@/utils/logAuth";
import sessionLogOutMethod from "@/utils/sessionLogOut";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";

export const useBussinesMicroservicio = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  // ⬅️ ELIMINADO: Sección PADRE completa

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

  const obtenerMadreHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/madres/obtener-listado-madres`);
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

  const obtenerTerneroHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/terneros/obtener-listado-terneros`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  // 🆕 NUEVO: Agregar peso diario del ternero
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

  // 🆕 NUEVO: Obtener historial completo de pesos
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

  // ⬅️ NUEVO: Hook para múltiples eventos
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

  const obtenerEventoHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/eventos/obtener-listado-eventos`);
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

  // 🆕 NUEVO: Crear múltiples tratamientos
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

  //seccion DIARREA TERNERO
  const crearDiarreTerneroHook = async (objectTratamiento) => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.post(
          `/diarrea-terneros/crear-diarrea-ternero`,
          objectTratamiento
        );
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response.status;
    }
  };

  const obtenerDiarreaTerneroHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(
          `/diarrea-terneros/obtener-listado-diarrea-terneros`
        );
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

  const obtenerResumenSaludHook = async () => {
    try {
      const { data, config, headers, status, statusText, request } =
        await businessApi.get(`/resumen-salud`);
      return { data, config, headers, status, statusText, request };
    } catch (error) {
      sessionLogOutMethod(dispatch);
      logAuthMethod(dispatch, router);
      return error.response?.status || error;
    }
  };

  return {
    // ⬅️ ELIMINADO: seccion PADRES
    //seccion MADRES
    crearMadreHook,
    obtenerMadreHook,
    //seccion TERNERO
    crearTerneroHook,
    obtenerTerneroHook,
    // 🆕 NUEVO: Peso diario
    agregarPesoDiarioHook,
    obtenerHistorialCompletoHook,
    //seccion EVENTO
    crearEventoHook,
    crearMultiplesEventosHook, // ⬅️ NUEVO
    obtenerEventoHook,
    //seccion TRATAMIENTO
    crearTratamientoHook,
    crearMultiplesTratamientosHook, // 🆕 NUEVO
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
  };
};
