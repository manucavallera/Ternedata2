import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

export const TeamManager = ({ establecimientoId }) => {
  const [team, setTeam] = useState([]);

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", role: "operario" });

  // Estados para la Invitación (Generación de Link)
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(""); // 👈 Nuevo: Guarda el link generado
  const [copied, setCopied] = useState(false); // 👈 Nuevo: Efecto visual de copiado

  // Asegúrate de que apunte al puerto 3001 (Backend de Usuarios/Auth)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  // ✅ 1. CARGAR EQUIPO (Sin cambios)
  const cargarEquipo = useCallback(async () => {
    if (!establecimientoId) return;

    setLoadingList(true);
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      // Filtrar por establecimiento
      const equipoDelCampo = response.data.filter(
        (u) => u.id_establecimiento == establecimientoId,
      );

      setTeam(equipoDelCampo);
    } catch (error) {
      console.error("Error cargando equipo:", error);
    } finally {
      setLoadingList(false);
    }
  }, [establecimientoId, API_URL]);

  useEffect(() => {
    cargarEquipo();
  }, [cargarEquipo]);

  // ✅ 2. NUEVA LÓGICA: GENERAR LINK EN PANTALLA
  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedLink("");

    try {
      console.log(
        `🧬 Generando token para: ${inviteData.email} con Rol: ${inviteData.role}`,
      );

      // 👇👇👇 AQUÍ ESTÁ EL CAMBIO QUE FALTA 👇👇👇
      const response = await axios.get(
        `${API_URL}/auth/generar-token?email=${inviteData.email}&rol=${inviteData.role}`,
      );

      const token = response.data.token_para_copiar;

      const origin = window.location.origin;
      const magicLink = `${origin}/register?token=${token}`;

      setGeneratedLink(magicLink);
    } catch (error) {
      console.error("Error al generar invitación:", error);
      alert("❌ Error: No se pudo conectar con el servidor de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Resetear modal al cerrar
  const cerrarModal = () => {
    setIsModalOpen(false);
    setGeneratedLink("");
    setInviteData({ email: "", role: "operario" });
    setCopied(false);
  };

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
          className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm'
        >
          <span>🔗</span> Generar Invitación
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
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getRolBadge(member.rol)}`}
                    >
                      {member.rol}
                    </span>
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
          </div>
        )}
      </div>

      {/* MODAL DE INVITACIÓN MEJORADO */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full shadow-2xl'>
            <h3 className='text-lg font-bold mb-4 text-gray-900 border-b pb-2'>
              {generatedLink
                ? "🎉 ¡Invitación Lista!"
                : "Invitar Nuevo Miembro"}
            </h3>

            {!generatedLink ? (
              // 📝 PARTE 1: FORMULARIO
              <form onSubmit={handleGenerateLink}>
                <div className='mb-4'>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Email del Usuario
                  </label>
                  <input
                    type='email'
                    required
                    placeholder='ejemplo@ternedata.com'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none'
                    value={inviteData.email}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, email: e.target.value })
                    }
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Generaremos un link único para este correo.
                  </p>
                </div>

                <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Rol Asignado
                  </label>
                  <select
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white'
                    value={inviteData.role}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, role: e.target.value })
                    }
                  >
                    <option value='operario'>👷 Operario</option>
                    <option value='veterinario'>🩺 Veterinario</option>
                    <option value='admin'>👑 Administrador</option>
                  </select>
                </div>

                <div className='flex justify-end gap-3 pt-2'>
                  <button
                    type='button'
                    onClick={cerrarModal}
                    className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium'
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    disabled={loading}
                    className='px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium shadow-md flex items-center gap-2'
                  >
                    {loading ? "Generando..." : "Generar Link"}
                  </button>
                </div>
              </form>
            ) : (
              // 🔗 PARTE 2: MOSTRAR LINK (RESULTADO)
              <div className='animate-fade-in-up'>
                <p className='text-sm text-gray-600 mb-2'>
                  Copia este enlace y envíalo por <b>WhatsApp</b> o <b>Email</b>
                  :
                </p>

                <div className='flex items-center bg-gray-100 border border-gray-300 rounded-lg p-2 mb-4'>
                  <input
                    readOnly
                    value={generatedLink}
                    className='flex-grow bg-transparent text-gray-600 text-xs sm:text-sm outline-none px-1 font-mono break-all'
                  />
                </div>

                <button
                  onClick={copyToClipboard}
                  className={`w-full py-2 mb-4 rounded-lg font-bold text-white transition-all transform active:scale-95 ${
                    copied ? "bg-green-500" : "bg-gray-800 hover:bg-black"
                  }`}
                >
                  {copied ? "✅ ¡Copiado al portapapeles!" : "📋 Copiar Link"}
                </button>

                <div className='flex justify-center pt-2'>
                  <button
                    type='button'
                    onClick={cerrarModal}
                    className='text-indigo-600 hover:text-indigo-800 text-sm font-medium hover:underline'
                  >
                    Cerrar y generar otro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
