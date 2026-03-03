import React, { useEffect, useState } from "react";
import { equipoService } from "@/services/equipoService";

export const TeamManager = ({ establecimientoId }) => {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (establecimientoId) {
      cargarEquipo();
    }
  }, [establecimientoId]);

  const cargarEquipo = async () => {
    setLoading(true);
    try {
      const data = await equipoService.getEquipo(establecimientoId);
      setMiembros(data);
    } catch (error) {
      console.error("Error cargando equipo", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitar = async (rol) => {
    try {
      const data = await equipoService.generarLink(establecimientoId, rol);
      // Copiar al portapapeles
      await navigator.clipboard.writeText(data.link);
      alert(
        `✅ ¡Link copiado!\n\nPégalo en el WhatsApp del ${rol}.\n\nLink: ${data.link}`
      );
    } catch (error) {
      console.error(error);
      alert("Error generando el link.");
    }
  };

  const handleEliminar = async (userId) => {
    if (!confirm("¿Seguro que querés sacar a esta persona del equipo?")) return;
    try {
      await equipoService.eliminarMiembro(establecimientoId, userId);
      cargarEquipo(); // Recargar la lista
    } catch (error) {
      alert("No se pudo eliminar al usuario.");
    }
  };

  return (
    <div className='bg-white p-6 rounded-lg shadow-md border border-gray-200'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h3 className='text-xl font-bold text-gray-800'>Equipo de Trabajo</h3>
          <p className='text-sm text-gray-500'>
            Gestiona quién puede acceder a este campo.
          </p>
        </div>
      </div>

      {/* BOTONES DE INVITAR */}
      <div className='flex gap-3 mb-6'>
        <button
          onClick={() => handleInvitar("veterinario")}
          className='flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm'
        >
          <span>🩺</span> Invitar Veterinario
        </button>
        <button
          onClick={() => handleInvitar("operario")}
          className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm'
        >
          <span>👷</span> Invitar Operario
        </button>
      </div>

      {/* TABLA */}
      {loading ? (
        <div className='text-center py-4 text-gray-500'>Cargando gente...</div>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-200'>
          <table className='w-full text-left'>
            <thead className='bg-gray-50 text-gray-700 font-semibold'>
              <tr>
                <th className='p-3 text-sm'>Nombre</th>
                <th className='p-3 text-sm'>Rol</th>
                <th className='p-3 text-sm text-right'>Acción</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {miembros.map((m) => (
                <tr key={m.userId} className='hover:bg-gray-50'>
                  <td className='p-3'>
                    <div className='font-medium text-gray-900'>{m.nombre}</div>
                    <div className='text-xs text-gray-500'>{m.email}</div>
                  </td>
                  <td className='p-3'>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        m.rol === "dueno"
                          ? "bg-purple-100 text-purple-800"
                          : m.rol === "veterinario"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {m.rol.toUpperCase()}
                    </span>
                  </td>
                  <td className='p-3 text-right'>
                    {m.rol !== "dueno" && (
                      <button
                        onClick={() => handleEliminar(m.userId)}
                        className='text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors text-sm font-medium'
                        title='Echar del equipo'
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {miembros.length === 0 && (
                <tr>
                  <td colSpan='3' className='p-4 text-center text-gray-500'>
                    Nadie en el equipo todavía. ¡Invita a alguien!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
