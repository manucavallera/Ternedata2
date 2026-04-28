import React, { useEffect, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import Select from "react-select";

// Estilos personalizados para que react-select se vea bien
const customStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(99,102,241,0.3)" : "none",
    borderRadius: "0.375rem",
    minHeight: "46px",
    backgroundColor: state.isDisabled ? "#f3f4f6" : "#fff",
    cursor: state.isDisabled ? "not-allowed" : "default",
    "&:hover": { borderColor: "#6366f1" },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#6366f1"
      : state.isFocused
      ? "#eef2ff"
      : "#fff",
    color: state.isSelected ? "#fff" : "#374151",
    fontSize: "14px",
    cursor: "pointer",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "14px" }),
  singleValue: (base) => ({ ...base, fontSize: "14px", color: "#111827" }),
  input: (base) => ({ ...base, fontSize: "14px" }),
  menu: (base) => ({ ...base, zIndex: 9999, borderRadius: "0.375rem" }),
  noOptionsMessage: (base) => ({ ...base, fontSize: "13px", color: "#6b7280" }),
};

const SeleccionarMadre = ({ madreSeleccionada, idEstablecimiento }) => {
  const { obtenerMadreHook } = useBussinesMicroservicio();

  const [opciones, setOpciones] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargarMadresList = async (idEstab) => {
    try {
      setLoading(true);
      const queryParams = idEstab
        ? `id_establecimiento=${idEstab}&limit=500`
        : "limit=500";
      const res = await obtenerMadreHook(queryParams);
      const madres = res?.data?.data || [];
      const opts = madres.map((m) => ({
        value: m.id_madre,
        label: `${m.nombre ? m.nombre + " — " : ""}RP: ${m.rp_madre}`,
      }));
      setOpciones(opts);

      // Si el establecimiento cambia y la madre seleccionada no pertenece al nuevo, limpiar
      if (seleccionada) {
        const sigueExistiendo = opts.some((o) => o.value === seleccionada.value);
        if (!sigueExistiendo) {
          setSeleccionada(null);
          madreSeleccionada("0");
        }
      }
    } catch {
      setOpciones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (opcion) => {
    setSeleccionada(opcion);
    madreSeleccionada(opcion ? String(opcion.value) : "0");
  };

  useEffect(() => {
    if (idEstablecimiento) cargarMadresList(idEstablecimiento);
  }, [idEstablecimiento]);

  return (
    <>
      <Select
        options={opciones}
        value={seleccionada}
        onChange={handleChange}
        isLoading={loading}
        isDisabled={loading || !idEstablecimiento}
        isClearable
        isSearchable
        placeholder={
          loading
            ? "Cargando madres..."
            : !idEstablecimiento
            ? "Primero seleccione un establecimiento"
            : "Buscar madre por nombre o RP..."
        }
        noOptionsMessage={() => "No hay madres disponibles"}
        styles={customStyles}
      />
      {opciones.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          📊 {opciones.length} madre(s) disponible(s)
        </p>
      )}
    </>
  );
};

export default SeleccionarMadre;
