import React, { useEffect, useState } from 'react';
import { useBussinesMicroservicio } from '@/hooks/bussines';
const SeleccionarMadre = ({ madreSeleccionada }) => {

  const {obtenerMadreHook} = useBussinesMicroservicio();

  const [madres, setMadres] = useState([]);
  const [selectedMadreId, setSelectedMadreId] = useState('');

  const cargarMadresList = async () => {
    const resListMadre =await obtenerMadreHook();
    setMadres(resListMadre?.data || []);
  }
  // Función para manejar el cambio de selección
  const handleSelectChange = (event) => {
    setSelectedMadreId(event.target.value);
    madreSeleccionada(event.target.value)
  };


  useEffect(()=> {
        cargarMadresList();
  },[])

  return (
        <>
              {/* Dropdown de selección de madres */}
      <select
        value={selectedMadreId}
        onChange={handleSelectChange}
        className="px-4 py-2 border border-gray-300 rounded-md bg-white shadow-sm"
      >
        <option value="0">Seleccione una Madre</option>
        {madres.map((madre) => (
          <option key={madre.id_madre} value={madre.id_madre}>
            {madre.nombre} (ID: {madre.id_madre})
          </option>
        ))}
      </select>

      {/* Mostrar el id seleccionado */}
      {selectedMadreId && (
        <p className="mt-4 text-gray-700">
          ID de la madre seleccionada: <strong>{selectedMadreId}</strong>
        </p>
      )}
        </>
  )
};

export default SeleccionarMadre;