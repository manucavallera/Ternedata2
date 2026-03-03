"use client";
import { useSelector } from "react-redux";

export default function EstablecimientoBadge() {
  const { userPayload } = useSelector((state) => state.auth);

  if (!userPayload) return null;

  // Función para obtener colores e iconos según el rol
  const getRolInfo = (rol) => {
    switch (rol) {
      case "admin":
        return {
          icon: "👑",
          label: "Administrador",
          color: "bg-purple-600 border-purple-400",
        };
      case "veterinario":
        return {
          icon: "🩺",
          label: "Veterinario",
          color: "bg-blue-600 border-blue-400",
        };
      case "operario":
        return {
          icon: "👷",
          label: "Operario",
          color: "bg-green-600 border-green-400",
        };
      default:
        return {
          icon: "👤",
          label: "Usuario",
          color: "bg-gray-600 border-gray-400",
        };
    }
  };

  const info = getRolInfo(userPayload.rol);

  return (
    <div
      className={`flex items-center gap-2 ${info.color} text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/20 transition-all hover:scale-105 cursor-default`}
      title={`Rol asignado: ${info.label}`}
    >
      <span className='text-sm'>{info.icon}</span>
      <span className='uppercase tracking-wider'>{info.label}</span>
    </div>
  );
}
