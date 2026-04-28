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

const SeleccionarTernero = ({ terneroSeleccionado, idEstablecimiento }) => {
  const { obtenerTerneroHook } = useBussinesMicroservicio();

  const [opciones, setOpciones] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargarTerneroList = async (idEstab) => {
    try {
      setLoading(true);
      const queryParams = idEstab
        ? `id_establecimiento=${idEstab}&limit=500`
        : "limit=500";
      const res = await obtenerTerneroHook(queryParams);
      const terneros = res?.data?.data || [];
      const opts = terneros.map((t) => ({
        value: t.id_ternero,
        label: `RP: ${t.rp_ternero} — ${t.sexo}${t.madre ? " (Madre RP: " + t.madre.rp_madre + ")" : ""}`,
      }));
      setOpciones(opts);

      if (seleccionado) {
        const sigueExistiendo = opts.some((o) => o.value === seleccionado.value);
        if (!sigueExistiendo) {
          setSeleccionado(null);
          terneroSeleccionado("0");
        }
      }
    } catch {
      setOpciones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (opcion) => {
    setSeleccionado(opcion);
    terneroSeleccionado(opcion ? String(opcion.value) : "0");
  };

  useEffect(() => {
    if (idEstablecimiento) cargarTerneroList(idEstablecimiento);
  }, [idEstablecimiento]);

  return (
    <>
      <Select
        options={opciones}
        value={seleccionado}
        onChange={handleChange}
        isLoading={loading}
        isDisabled={loading || !idEstablecimiento}
        isClearable
        isSearchable
        placeholder={
          loading
            ? "Cargando terneros..."
            : !idEstablecimiento
            ? "Primero seleccione un establecimiento"
            : "Buscar ternero por RP..."
        }
        noOptionsMessage={() => "No hay terneros disponibles"}
        styles={customStyles}
      />
      {opciones.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          🐄 {opciones.length} ternero(s) disponible(s)
        </p>
      )}
    </>
  );
};

export default SeleccionarTernero;
