import businessApi from "@/api/bussines-api";

export const equipoService = {
  // Obtener la lista de miembros
  getEquipo: async (establecimientoId) => {
    const { data } = await businessApi.get(
      `/establecimientos/${establecimientoId}/equipo`
    );
    return data;
  },

  // Invitar con email (envía email directo)
  invitarConEmail: async (establecimientoId, email, rol) => {
    const { data } = await businessApi.post(
      `/invitaciones/crear/${establecimientoId}`,
      { email, rol }
    );
    return data; // { link, token, emailEnviado }
  },

  // Generar link sin email (para copiar)
  generarLink: async (establecimientoId, rol) => {
    const { data } = await businessApi.post(
      `/invitaciones/crear/${establecimientoId}`,
      { rol }
    );
    return data;
  },

  // Invitaciones pendientes
  getPendientes: async (establecimientoId) => {
    const { data } = await businessApi.get(
      `/invitaciones/pendientes/${establecimientoId}`
    );
    return data;
  },

  // Revocar invitación
  revocarInvitacion: async (invitacionId) => {
    const { data } = await businessApi.delete(
      `/invitaciones/revocar/${invitacionId}`
    );
    return data;
  },

  // Eliminar miembro del equipo
  eliminarMiembro: async (establecimientoId, userId) => {
    const { data } = await businessApi.delete(
      `/establecimientos/${establecimientoId}/equipo/${userId}`
    );
    return data;
  },

  // Aceptar invitación (para la pantalla /join)
  unirseAlEquipo: async (token) => {
    const { data } = await businessApi.post(`/invitaciones/aceptar`, { token });
    return data;
  },
};
