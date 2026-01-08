"use client";

import { useSelector } from "react-redux";

export default function EstablecimientoBadge() {
  const { userPayload, establecimientoActual } = useSelector(
    (state) => state.auth
  );

  // Si es admin y no ha seleccionado establecimiento
  if (userPayload?.rol === "admin" && !establecimientoActual) {
    return (
      <div className='flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='currentColor'
          className='w-4 h-4'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
          />
        </svg>
        <span>👑 Admin - Todos los Establecimientos</span>
      </div>
    );
  }

  // Si es admin y seleccionó un establecimiento
  if (userPayload?.rol === "admin" && establecimientoActual) {
    const nombreEstablecimiento = establecimientoActual === 1 ? "Norte" : "Sur";
    return (
      <div className='flex items-center gap-2 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='currentColor'
          className='w-4 h-4'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z'
          />
        </svg>
        <span>👑 Admin viendo: {nombreEstablecimiento}</span>
      </div>
    );
  }

  // Si es veterinario u operario
  if (userPayload?.id_establecimiento) {
    const nombreEstablecimiento =
      userPayload.id_establecimiento === 1 ? "Norte" : "Sur";
    const colorRol =
      userPayload.rol === "veterinario" ? "bg-green-600" : "bg-yellow-600";

    return (
      <div
        className={`flex items-center gap-2 ${colorRol} text-white px-3 py-1 rounded-full text-sm font-semibold`}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='currentColor'
          className='w-4 h-4'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z'
          />
        </svg>
        <span>🏢 {nombreEstablecimiento}</span>
      </div>
    );
  }

  return null;
}
