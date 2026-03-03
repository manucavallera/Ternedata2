import React, { useState } from "react";

export const TeamManager = () => {
  // Estado local simulado (luego lo conectaremos al Backend/Redux)
  const [team, setTeam] = useState([
    { id: 1, name: "Manu", email: "manu@ternedata.com", role: "Admin" },
    { id: 2, name: "Javi", email: "javi@ternedata.com", role: "Colaborador" },
  ]);

  return (
    <div className='bg-white shadow rounded-lg p-6 mt-6 border border-gray-200'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-bold text-gray-800'>
          Equipo del Establecimiento
        </h2>
        <button className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors'>
          + Invitar Miembro
        </button>
      </div>

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
          <p className='text-center text-gray-500 py-4'>
            No hay miembros en este equipo aún.
          </p>
        )}
      </div>
    </div>
  );
};
