import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const SeleccionarTratamiento = ({ tratamientoSeleccionado }) => {
  const { obtenerTratamientoHook } = useBussinesMicroservicio();

  // 🆕 Obtener datos del Redux
  const { establecimientoActual, userPayload } = useSelector(
    (state) => state.auth
  );

  const [tratamientos, setTratamientos] = useState([]);
  const [selectedTratamientoId, setSelectedTratamientoId] = useState("");
  const [loading, setLoading] = useState(false);

  // 🆕 Función para construir query params según el rol
  const construirQueryParams = () => {
    // Si es admin y tiene un establecimiento seleccionado
    if (userPayload?.rol === "admin" && establecimientoActual) {
      return `id_establecimiento=${establecimientoActual}`;
    }
    // Para veterinario/operario, el backend filtra automáticamente
    // Para admin sin establecimiento, ve todo
    return "";
  };

  const cargarTratamientosList = async () => {
    try {
      setLoading(true);

      const queryParams = construirQueryParams();

      console.log("🔍 Cargando tratamientos con params:", queryParams);
      console.log("📊 Estado actual:", {
        rol: userPayload?.rol,
        id_establecimiento_jwt: userPayload?.id_establecimiento,
        establecimientoActual: establecimientoActual,
      });

      const resListTratamientos = await obtenerTratamientoHook(queryParams);

      console.log("✅ Tratamientos recibidos:", resListTratamientos?.data);

      setTratamientos(resListTratamientos?.data || []);
    } catch (error) {
      console.error("❌ Error cargando tratamientos:", error);
      setTratamientos([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el cambio de selección
  const handleSelectChange = (event) => {
    setSelectedTratamientoId(event.target.value);
    tratamientoSeleccionado(event.target.value);
  };

  // 🆕 Recargar cuando cambie el establecimiento (solo para admin)
  useEffect(() => {
    cargarTratamientosList();
  }, [establecimientoActual]);

  return (
    <>
      {/* 🆕 Mensaje informativo para admin */}
      {userPayload?.rol === "admin" && !establecimientoActual && (
        <div className='mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800'>
          ⚠️ Selecciona un establecimiento para filtrar los tratamientos
        </div>
      )}

      {/* Dropdown de selección de tratamientos */}
      <select
        value={selectedTratamientoId}
        onChange={handleSelectChange}
        disabled={loading}
        className='w-full px-4 py-3 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        <option value='0'>
          {loading
            ? "Cargando tratamientos..."
            : tratamientos.length === 0
            ? "No hay tratamientos disponibles"
            : "Seleccione un Tratamiento"}
        </option>
        {tratamientos.map((tratamiento) => (
          <option
            key={tratamiento.id_tratamiento}
            value={tratamiento.id_tratamiento}
          >
            {tratamiento.nombre} - {tratamiento.tipo_enfermedad} (ID:{" "}
            {tratamiento.id_tratamiento})
          </option>
        ))}
      </select>

      {/* Mostrar el id seleccionado */}
      {selectedTratamientoId && selectedTratamientoId !== "0" && (
        <p className='mt-2 text-gray-700 text-sm'>
          ID del tratamiento seleccionado:{" "}
          <strong>{selectedTratamientoId}</strong>
        </p>
      )}

      {/* 🆕 Debug info (puedes comentar en producción) */}
      {process.env.NODE_ENV === "development" && (
        <div className='mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs'>
          <p>
            <strong>Debug:</strong>
          </p>
          <p>Rol: {userPayload?.rol}</p>
          <p>Establecimiento actual: {establecimientoActual || "Ninguno"}</p>
          <p>Tratamientos disponibles: {tratamientos.length}</p>
        </div>
      )}
    </>
  );
};

export default SeleccionarTratamiento;
