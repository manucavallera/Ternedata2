import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const SeleccionarMadre = ({ madreSeleccionada, idEstablecimiento }) => {
  const { obtenerMadreHook } = useBussinesMicroservicio();

  const [madres, setMadres] = useState([]);
  const [selectedMadreId, setSelectedMadreId] = useState("");
  const [loading, setLoading] = useState(false);

  // ⬅️ NUEVO: Cargar madres filtradas por establecimiento
  const cargarMadresList = async (idEstab) => {
    try {
      setLoading(true);

      // Si hay establecimiento, filtrar por él
      const queryParams = idEstab ? `id_establecimiento=${idEstab}` : "";
      const resListMadre = await obtenerMadreHook(queryParams);

      setMadres(resListMadre?.data || []);

      // Si cambia el establecimiento, resetear selección
      if (selectedMadreId) {
        const madreExiste = resListMadre?.data?.some(
          (m) => m.id_madre === parseInt(selectedMadreId)
        );
        if (!madreExiste) {
          setSelectedMadreId("");
          madreSeleccionada("0");
        }
      }
    } catch (error) {
      console.error("Error al cargar madres:", error);
      setMadres([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el cambio de selección
  const handleSelectChange = (event) => {
    setSelectedMadreId(event.target.value);
    madreSeleccionada(event.target.value);
  };

  // ⬅️ NUEVO: Recargar madres cuando cambia el establecimiento
  useEffect(() => {
    if (idEstablecimiento) {
      cargarMadresList(idEstablecimiento);
    }
  }, [idEstablecimiento]);

  return (
    <>
      {/* Dropdown de selección de madres */}
      <select
        value={selectedMadreId}
        onChange={handleSelectChange}
        disabled={loading || !idEstablecimiento}
        className={`w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          loading || !idEstablecimiento
            ? "bg-gray-100 cursor-not-allowed"
            : "bg-white"
        } border-gray-300`}
      >
        <option value='0'>
          {loading
            ? "Cargando madres..."
            : !idEstablecimiento
            ? "Primero seleccione un establecimiento"
            : madres.length === 0
            ? "No hay madres disponibles"
            : "Seleccione una Madre"}
        </option>
        {madres.map((madre) => (
          <option key={madre.id_madre} value={madre.id_madre}>
            {madre.nombre} - RP: {madre.rp_madre}
          </option>
        ))}
      </select>

      {/* Información adicional */}
      {madres.length > 0 && (
        <p className='mt-1 text-xs text-gray-500'>
          📊 {madres.length} madre(s) disponible(s) en este establecimiento
        </p>
      )}

      {/* Mostrar el id seleccionado (solo en desarrollo) */}
      {selectedMadreId &&
        selectedMadreId !== "0" &&
        process.env.NODE_ENV === "development" && (
          <p className='mt-2 text-xs text-gray-600'>
            ID seleccionado: <strong>{selectedMadreId}</strong>
          </p>
        )}
    </>
  );
};

export default SeleccionarMadre;
