import React, { useEffect, useState } from 'react';
import { useBussinesMicroservicio } from '@/hooks/bussines';
const SeleccionarTratamiento = ({ tratamientoSeleccionado }) => {

  const {obtenerTratamientoHook} = useBussinesMicroservicio();

  const [tratamientos, setTratamientos] = useState([]);
  const [selectedTratamientoId, setSelectedTratamientoId] = useState('');

  const cargarTratamientosList = async () => {
    const resListTratamientos =await obtenerTratamientoHook();
    setTratamientos(resListTratamientos?.data ||[]);
  }
  // Función para manejar el cambio de selección
  const handleSelectChange = (event) => {
    setSelectedTratamientoId(event.target.value);
    tratamientoSeleccionado(event.target.value)
  };


  useEffect(()=> {
    cargarTratamientosList();
  },[])

  return (
        <>
              {/* Dropdown de selección de tratamientos */}
      <select
        value={selectedTratamientoId}
        onChange={handleSelectChange}
        className="px-4 py-2 border border-gray-300 rounded-md bg-white shadow-sm"
      >
        <option value="0">Seleccione una Tratamiento</option>
        {tratamientos.map((tratamiento) => (
          <option key={tratamiento.id_tratamiento} value={tratamiento.id_tratamiento}>
            {tratamiento.rp_tratamiento} (ID: {tratamiento.id_tratamiento})
          </option>
        ))}
      </select>

      {/* Mostrar el id seleccionado */}
      {selectedTratamientoId && (
        <p className="mt-4 text-gray-700">
          ID del tratamiento seleccionado: <strong>{selectedTratamientoId}</strong>
        </p>
      )}
        </>
  )
};

export default SeleccionarTratamiento;