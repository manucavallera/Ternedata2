"use client";

import { useSelector, useDispatch } from "react-redux";
import { setEstablecimientoActual } from "@/store/auth";
import { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { usePathname, useRouter } from "next/navigation";
import {
  esContextoForrajeria,
  obtenerRutaInicio,
} from "@/app/forrajeria/context";

export default function EstablecimientoSelector() {
  const dispatch = useDispatch();
  const { userPayload, establecimientoActual } = useSelector(
    (state) => state.auth
  );
  const { obtenerEstablecimientosHook } = useBussinesMicroservicio();
  const router = useRouter();
  const pathname = usePathname();

  const [establecimientos, setEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fallos, setFallos] = useState(0);

  // Recargar cuando el usuario obtiene un establecimiento (ej: después de crear uno nuevo)
  useEffect(() => {
    cargarEstablecimientos();
  }, [userPayload?.id_establecimiento]);

  // Si la carga falla (ej: 429 por rate limit), reintentar solo unas veces antes de pedirlo a mano
  useEffect(() => {
    if (fallos === 0 || fallos > 4) return;
    const timer = setTimeout(cargarEstablecimientos, 15000);
    return () => clearTimeout(timer);
  }, [fallos]);

  const cargarEstablecimientos = async () => {
    try {
      setLoading(true);
      const response = await obtenerEstablecimientosHook();

      if (response?.status !== 200) {
        setFallos((n) => n + 1);
      } else {
        setFallos(0);
        // Filtrar solo establecimientos activos
        const establecimientosActivos = response.data.filter(
          (e) => e.estado === "activo"
        );
        setEstablecimientos(establecimientosActivos);

        if (!establecimientoActual) {
          // Recordar el último elegido (Redux se pierde al refrescar la página)
          const guardado = parseInt(
            localStorage.getItem("establecimientoActual")
          );
          const sigueActivo = establecimientosActivos.some(
            (e) => e.id_establecimiento === guardado
          );

          if (sigueActivo) {
            dispatch(setEstablecimientoActual(guardado));
          } else if (establecimientosActivos.length === 1) {
            // Si solo hay uno, seleccionarlo automáticamente
            dispatch(
              setEstablecimientoActual(
                establecimientosActivos[0].id_establecimiento
              )
            );
          }
        }
      }
    } catch (error) {
      console.error("Error al cargar establecimientos:", error);
      setFallos((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  // 👇 CORRECCIÓN: Permitir que lo vean Admin Y SuperAdmin
  const rolesPermitidos = ["admin", "super_admin"];
  if (!userPayload?.rol || !rolesPermitidos.includes(userPayload.rol)) {
    return null;
  }

  const handleChange = (e) => {
    const establecimientoId = e.target.value ? parseInt(e.target.value) : null;
    const seleccionado = establecimientos.find(
      (est) => est.id_establecimiento === establecimientoId
    );
    dispatch(setEstablecimientoActual(establecimientoId));

    if (establecimientoId) {
      localStorage.setItem("establecimientoActual", establecimientoId);
    } else {
      localStorage.removeItem("establecimientoActual");
    }

    // Redirigir solo al cambiar de tipo de organización (ganadería ↔ forrajería)
    const enForrajeria = pathname.startsWith("/forrajeria");
    if (seleccionado && esContextoForrajeria(seleccionado) !== enForrajeria) {
      router.push(obtenerRutaInicio(seleccionado));
    }
  };

  if (loading) {
    return <div className='text-white text-xs sm:text-sm'>Cargando...</div>;
  }

  if (fallos > 0 && establecimientos.length === 0) {
    return (
      <button
        type='button'
        onClick={cargarEstablecimientos}
        className='text-white text-xs sm:text-sm font-semibold border border-white rounded px-2 sm:px-3 py-1 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-white'
      >
        ⚠️ No se cargaron los establecimientos. Reintentar
      </button>
    );
  }

  return (
    <div className='flex items-center gap-1 sm:gap-2'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
        stroke='currentColor'
        className='w-4 h-4 sm:w-5 sm:h-5 text-white'
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
        className='bg-green-500 text-white border border-white rounded px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-white cursor-pointer'
      >
        <option value=''>📊 Seleccionar Establecimiento</option>
        {establecimientos.map((est) => (
          <option key={est.id_establecimiento} value={est.id_establecimiento}>
          {est.tipo_organizacion === "forrajeria" ? "🌾" : "🐄"} {est.nombre}
          </option>
        ))}
      </select>

      {establecimientos.length > 0 && (
        <span className='hidden sm:inline-block text-white text-xs bg-green-600 px-2 py-1 rounded-full'>
          {establecimientos.length}
        </span>
      )}
    </div>
  );
}
