"use client";
import { useSelector } from "react-redux";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";

export default function EstablecimientoBadge() {
  const { userPayload } = useSelector((state) => state.auth);
  const rolCampo = useRolEnCampo();

  if (!userPayload) return null;

  // El rol que vale es el del campo que está mirando: un admin global puede ser operario en un campo ajeno.
  const rolReal =
    userPayload.rol === "super_admin" ? "super_admin" : rolCampo || userPayload.rol || "usuario";

  // Función para obtener colores e iconos según el rol
  const getRolInfo = (rol) => {
    const r = rol?.toLowerCase() || "";

    if (r === "super_admin") {
      return {
        icon: "🛡️",
        label: "Super Admin",
        color: "bg-red-600 border-red-400",
      };
    }

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
