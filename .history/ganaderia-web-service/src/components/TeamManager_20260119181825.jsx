import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

export const TeamManager = ({ establecimientoId }) => {
  // ✅ ESTADO VACÍO (Se llenará con datos reales)
  const [team, setTeam] = useState([]);

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", role: "operario" });
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"; // Ojo: Puerto 3001 (Users) suele ser el correcto para usuarios

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  // ✅ 1. FUNCIÓN PARA CARGAR EL EQUIPO REAL
  const cargarEquipo = useCallback(async () => {
    if (!establecimientoId) return;

    setLoadingList(true);
    try {
      // Intentamos traer todos los usuarios y filtramos por este establecimiento
      // (Esta es la forma más segura si no tienes un endpoint específico aún)
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      // Filtramos solo los que pertenecen a este campo
      // Usamos == por si uno es string y el otro number
      const equipoDelCampo = response.data.filter(
        (u) => u.id_establecimiento == establecimientoId,
      );

      setTeam(equipoDelCampo);
      console.log("👥 Equipo cargado:", equipoDelCampo);
    } catch (error) {
      console.error("Error cargando equipo:", error);
    } finally {
      setLoadingList(false);
    }
  }, [establecimientoId, API_URL]);

  // ✅ 2. EFECTO: Cargar equipo al abrir el componente
  useEffect(() => {
    cargarEquipo();
  }, [cargarEquipo]);

  // Función para enviar invitación
  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Nota: Si BUSINESS_API es "http://localhost:3000"
      const BUSINESS_API = "http://localhost:3000";

      console.log(
        "📨 Enviando a:",
        `${BUSINESS_API}/invitaciones/crear/${establecimientoId}`,
      );

      await axios.post(
        // 👇 CORRECCIÓN AQUÍ: Quitamos el "/api" del principio
        `${BUSINESS_API}/invitaciones/crear/${establecimientoId}`,
        {
          email: inviteData.email,
          rol: inviteData.role,
          role: inviteData.role,
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );

      alert(`✅ Invitación enviada a ${inviteData.email}`);
      setIsModalOpen(false);
      setInviteData({ email: "", role: "operario" });

      // Opcional: Recargar lista (aunque el usuario invitado no aparecerá hasta que acepte)
      // cargarEquipo();
    } catch (error) {
      console.error("Error al invitar:", error);
      alert(
        "❌ Error al enviar invitación. Verifica que el email no esté ya registrado.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para colores de rol
  const getRolBadge = (rol) => {
    const r = rol?.toLowerCase() || "operario";
    if (r.includes("admin")) return "bg-purple-100 text-purple-800";
    if (r.includes("veterinario")) return "bg-blue-100 text-blue-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className='bg-white shadow rounded-lg p-6 border border-gray-200'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h2 className='text-xl font-bold text-gray-800'>
            Equipo del Establecimiento
          </h2>
          <p className='text-sm text-gray-500'>
            Personas con acceso al ID: {establecimientoId}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm'
        >
          <span>✉️</span> Invitar Miembro
        </button>
      </div>

      {/* Tabla de Miembros */}
      <div className='overflow-x-auto'>
        {loadingList ? (
          <div className='text-center py-4 text-gray-500'>
            Cargando equipo...
          </div>
        ) : (
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
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Teléfono
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
                    {/* ✅ AQUÍ ESTABA EL ERROR: Usamos member.rol (backend) en vez de member.role */}
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getRolBadge(member.rol)}`}
                    >
                      {member.rol}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {member.telefono || "-"}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    <button className='text-red-600 hover:text-red-900 ml-4 font-semibold'>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {team.length === 0 && !loadingList && (
          <div className='text-center py-12 bg-gray-50 rounded-lg mt-4 border border-dashed border-gray-300'>
            <p className='text-gray-500 text-lg'>
              No hay miembros en este equipo aún.
            </p>
            <p className='text-sm text-gray-400'>
              ¡Invita a tu primer veterinario u operario!
            </p>
          </div>
        )}
      </div>

      {/* MODAL DE INVITACIÓN */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full shadow-2xl'>
            <h3 className='text-lg font-bold mb-4 text-gray-900 border-b pb-2'>
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
                <p className='text-xs text-gray-500 mt-1'>
                  Le llegará un correo con un link para unirse.
                </p>
              </div>

              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Rol Asignado
                </label>
                <select
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none bg-white'
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

              <div className='flex justify-end gap-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setIsModalOpen(false)}
                  className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={loading}
                  className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium shadow-md'
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
