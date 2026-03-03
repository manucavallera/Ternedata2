import businessApi from "@/api/bussines-api"; // Asegúrate de que la ruta importe tu archivo business-api.js

export const equipoService = {
  // 1. Obtener la lista de miembros (Para pintar la tabla)
  getEquipo: async (establecimientoId) => {
    try {
      const { data } = await businessApi.get(
        `/establecimientos/${establecimientoId}/equipo`
      );
      return data;
    } catch (error) {
      console.error("Error obteniendo equipo:", error);
      throw error;
    }
  },

  // 2. Generar Link de Invitación (Para el botón del Dueño)
  generarLink: async (establecimientoId, rol) => {
    try {
      // rol debe ser 'veterinario' u 'operario'
      const { data } = await businessApi.post(
        `/invitaciones/crear/${establecimientoId}`,
        { rol }
      );
      return data; // Retorna { link: '...', token: '...' }
    } catch (error) {
      console.error("Error generando invitación:", error);
      throw error;
    }
  },

  // 3. Eliminar a un miembro (Botón de borrar)
  eliminarMiembro: async (establecimientoId, userId) => {
    try {
      const { data } = await businessApi.delete(
        `/establecimientos/${establecimientoId}/equipo/${userId}`
      );
      return data;
    } catch (error) {
      console.error("Error eliminando miembro:", error);
      throw error;
    }
  },

  // 4. Aceptar Invitación (Para la pantalla /join)
  unirseAlEquipo: async (token) => {
    try {
      const { data } = await businessApi.post(`/invitaciones/aceptar`, {
        token,
      });
      return data;
    } catch (error) {
      // Es útil devolver el error para mostrar si el token expiró
      throw error.response ? error.response.data : error;
    }
  },
};
