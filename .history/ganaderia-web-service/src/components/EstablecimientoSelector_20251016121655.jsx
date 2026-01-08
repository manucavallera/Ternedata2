"use client";

import { useSelector, useDispatch } from "react-redux";
import { setEstablecimientoActual } from "@/store/auth";
import { useEffect, useState } from "react";

export default function EstablecimientoSelector() {
  const dispatch = useDispatch();
  const { userPayload, establecimientoActual } = useSelector(
    (state) => state.auth
  );
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar lista de establecimientos (esto lo haremos después con una API)
  useEffect(() => {
    // TODO: Llamar a API /establecimientos
    // Por ahora hardcodeamos:
    setEstablecimientos([
      { id: 1, nombre: "Establecimiento Norte" },
      { id: 2, nombre: "Establecimiento Sur" },
    ]);
    setLoading(false);
  }, []);

  // Si no es admin, no mostrar selector
  if (userPayload?.rol !== "admin") {
    return null;
  }

  const handleChange = (e) => {
    const establecimientoId = e.target.value ? parseInt(e.target.value) : null;
    dispatch(setEstablecimientoActual(establecimientoId));
  };

  if (loading) {
    return <div className='text-white text-sm'>Cargando...</div>;
  }

  return (
    <div className='flex items-center gap-2'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
        stroke='currentColor'
        className='w-5 h-5 text-white'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z'
        />
      </svg>

      <select
        value={establecimientoActual || ""}
        onChange={handleChange}
        className='bg-green-500 text-white border border-white rounded px-3 py-1 text-sm font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-white'
      >
        <option value=''>📊 Todos los Establecimientos</option>
        {establecimientos.map((est) => (
          <option key={est.id} value={est.id}>
            🏢 {est.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
