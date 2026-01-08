import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const SeleccionarTernero = ({ terneroSeleccionado, idEstablecimiento }) => {
  const { obtenerTerneroHook } = useBussinesMicroservicio();

  const [terneros, setTerneros] = useState([]);
  const [selectedTerneroId, setSelectedTerneroId] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Cargar terneros filtrados por establecimiento
  const cargarTerneroList = async (idEstab) => {
    try {
      setLoading(true);

      // Si hay establecimiento, filtrar por él
      const queryParams = idEstab ? `id_establecimiento=${idEstab}` : "";
      const resListTernero = await obtenerTerneroHook(queryParams);

      setTerneros(resListTernero?.data || []);

      // Si cambia el establecimiento, resetear selección
      if (selectedTerneroId) {
        const terneroExiste = resListTernero?.data?.some(
          (t) => t.id_ternero === parseInt(selectedTerneroId)
        );
        if (!terneroExiste) {
          setSelectedTerneroId("");
          terneroSeleccionado("0");
        }
      }
    } catch (error) {
      console.error("Error al cargar terneros:", error);
      setTerneros([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el cambio de selección
  const handleSelectChange = (event) => {
    setSelectedTerneroId(event.target.value);
    terneroSeleccionado(event.target.value);
  };

  // ✅ Recargar terneros cuando cambia el establecimiento
  useEffect(() => {
    if (idEstablecimiento) {
      cargarTerneroList(idEstablecimiento);
    }
  }, [idEstablecimiento]);

  return (
    <>
      {/* Dropdown de selección de terneros */}
      <select
        value={selectedTerneroId}
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
            ? "Cargando terneros..."
            : !idEstablecimiento
            ? "Primero seleccione un establecimiento"
            : terneros.length === 0
            ? "No hay terneros disponibles"
            : "Seleccione un Ternero"}
        </option>
        {terneros.map((ternero) => (
          <option key={ternero.id_ternero} value={ternero.id_ternero}>
            RP: {ternero.rp_ternero} - Sexo: {ternero.sexo}
          </option>
        ))}
      </select>

      {/* Información adicional */}
      {terneros.length > 0 && (
        <p className='mt-1 text-xs text-gray-500'>
          🐄 {terneros.length} ternero(s) disponible(s) en este establecimiento
        </p>
      )}

      {/* Mostrar el id seleccionado (solo en desarrollo) */}
      {selectedTerneroId &&
        selectedTerneroId !== "0" &&
        process.env.NODE_ENV === "development" && (
          <p className='mt-2 text-xs text-gray-600'>
            ID seleccionado: <strong>{selectedTerneroId}</strong>
          </p>
        )}
    </>
  );
};

export default SeleccionarTernero;
