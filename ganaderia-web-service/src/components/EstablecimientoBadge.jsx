"use client";
import { useSelector } from "react-redux";

export default function EstablecimientoBadge() {
  const { userPayload } = useSelector((state) => state.auth);

  if (!userPayload) return null;

  // Si es admin global, siempre mostrar admin (no pisar con roles de invitación)
  const resolverRolReal = () => {
    if (userPayload.rol === 'admin') return 'admin';
    const currentFarmId = userPayload.id_establecimiento;
    const roleInFarm = userPayload.userEstablecimientos?.find(
      (ue) => ue.establecimientoId === currentFarmId,
    )?.rol;
    return roleInFarm || userPayload.rol || "usuario";
  };

  const rolReal = resolverRolReal();

  // Función para obtener colores e iconos según el rol
  const getRolInfo = (rol) => {
    const r = rol?.toLowerCase() || "";

    // Mapeo flexible para cubrir "dueno", "admin", "administrador"
    if (r.includes("admin") || r.includes("dueno")) {
      return {
        icon: "👑",
        label: "Dueño / Admin",
        color: "bg-purple-600 border-purple-400",
      };
    }
    if (r.includes("veterinario")) {
      return {
        icon: "🩺",
        label: "Veterinario",
        color: "bg-blue-600 border-blue-400",
      };
    }
    if (r.includes("operario")) {
      return {
        icon: "👷",
        label: "Operario",
        color: "bg-green-600 border-green-400",
      };
    }

    // Default
    return {
      icon: "👤",
      label: r, // Muestra el rol tal cual si no lo conocemos
      color: "bg-gray-600 border-gray-400",
    };
  };

  const info = getRolInfo(rolReal);

  return (
    <div
      className={`flex items-center gap-2 ${info.color} text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/20 transition-all hover:scale-105 cursor-default`}
      title={`Rol asignado en este campo: ${info.label}`}
    >
      <span className='text-sm'>{info.icon}</span>
      <span className='uppercase tracking-wider'>{info.label}</span>
    </div>
  );
}
