import React, { useEffect, useState } from 'react';
import { useBussinesMicroservicio } from '@/hooks/bussines';
const SeleccionarTernero = ({ terneroSeleccionado }) => {

  const {obtenerTerneroHook} = useBussinesMicroservicio();

  const [terneros, setTerneros] = useState([]);
  const [selectedTerneroId, setSelectedTerneroId] = useState('');

  const cargarTerneroList = async () => {
    const resListTernero =await obtenerTerneroHook();
    setTerneros(resListTernero?.data || []);
  }
  // Función para manejar el cambio de selección
  const handleSelectChange = (event) => {
    setSelectedTerneroId(event.target.value);
    terneroSeleccionado(event.target.value)
  };


  useEffect(()=> {
        cargarTerneroList();
  },[])

  return (
        <>
              {/* Dropdown de selección de terneros */}
      <select
        value={selectedTerneroId}
        onChange={handleSelectChange}
        className="px-4 py-2 border border-gray-300 rounded-md bg-white shadow-sm"
      >
        <option value="0">Seleccione una Ternero</option>
        {terneros.map((ternero) => (
          <option key={ternero.id_ternero} value={ternero.id_ternero}>
            {ternero.rp_ternero} (ID: {ternero.id_ternero})
          </option>
        ))}
      </select>

      {/* Mostrar el id seleccionado */}
      {selectedTerneroId && (
        <p className="mt-4 text-gray-700">
          ID de la ternero seleccionado: <strong>{selectedTerneroId}</strong>
        </p>
      )}
        </>
  )
};

export default SeleccionarTernero;