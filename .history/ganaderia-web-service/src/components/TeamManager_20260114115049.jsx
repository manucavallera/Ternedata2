import React, { useState } from "react";
import axios from "axios";

// Si tienes un componente de Alerta o Toast, impórtalo aquí.
// Si no, usaremos window.alert por ahora.

export const TeamManager = ({ establecimientoId }) => {
  // Estado de los miembros (esto vendrá del backend luego)
  const [team, setTeam] = useState([
    { id: 1, name: "Manu", email: "manu@ternedata.com", role: "Admin" },
    { id: 2, name: "Javi", email: "javi@ternedata.com", role: "Veterinario" },
  ]);

  // Estados para el Modal de Invitación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", role: "operario" });
  const [loading, setLoading] = useState(false);

  // Obtener URL de la API (ajusta según tu .env)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  // Función para enviar la invitación
  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(
        `${API_URL}/invitaciones/crear/${establecimientoId}`,
        {
          email: inviteData.email,
          rol: inviteData.role,
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      // Simulación de éxito
      console.log(
        "Enviando invitación a:",
        inviteData,
        "para establecimiento:",
        establecimientoId
      );

      alert(`Invitación enviada a ${inviteData.email} correctamente.`);
      setIsModalOpen(false);
      setInviteData({ email: "", role: "operario" });
    } catch (error) {
      console.error("Error al invitar:", error);
      alert("Error al enviar la invitación. Verifica el email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-white shadow rounded-lg p-6 border border-gray-200'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h2 className='text-xl font-bold text-gray-800'>
            Equipo del Establecimiento
          </h2>
          <p className='text-sm text-gray-500'>
            Gestiona quién tiene acceso a este campo.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2'
        >
          <span>✉️</span> Invitar Miembro
        </button>
      </div>

      {/* Tabla de Miembros */}
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Nombre
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Email
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Rol
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {team.map((member) => (
              <tr key={member.id}>
                <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                  {member.name}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                  {member.email}
                </td>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.role === "Admin"
                        ? "bg-purple-100 text-purple-800"
                        : member.role === "Veterinario"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {member.role}
                  </span>
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                  <button className='text-red-600 hover:text-red-900 ml-4'>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {team.length === 0 && (
          <p className='text-center text-gray-500 py-8'>
            No hay miembros en este equipo aún.
          </p>
        )}
      </div>

      {/* MODAL DE INVITACIÓN */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full shadow-xl'>
            <h3 className='text-lg font-bold mb-4 text-gray-900'>
              Invitar Nuevo Miembro
            </h3>

            <form onSubmit={handleInvite}>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Email del Usuario
                </label>
                <input
                  type='email'
                  required
                  placeholder='ejemplo@ternedata.com'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none'
                  value={inviteData.email}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, email: e.target.value })
                  }
                />
              </div>

              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Rol Asignado
                </label>
                <select
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none'
                  value={inviteData.role}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, role: e.target.value })
                  }
                >
                  <option value='operario'>👷 Operario (Básico)</option>
                  <option value='veterinario'>🩺 Veterinario (Salud)</option>
                  <option value='admin'>👑 Administrador (Total)</option>
                </select>
              </div>

              <div className='flex justify-end gap-3'>
                <button
                  type='button'
                  onClick={() => setIsModalOpen(false)}
                  className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={loading}
                  className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50'
                >
                  {loading ? "Enviando..." : "Enviar Invitación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
