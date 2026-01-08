import React, { useState, useEffect } from "react";
import SeleccionarMadre from "./Select-Madre";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux"; // ⬅️ AGREGAR

const FormularioTernero = ({ setStep }) => {
  const { userPayload } = useSelector((state) => state.auth);
  const { crearTerneroHook, obtenerRodeosHook } = useBussinesMicroservicio(); // ⬅️ AGREGAR obtenerRodeosHook

  // ⬅️ NUEVO: Estado para rodeos
  const [rodeos, setRodeos] = useState([]);
  const [loadingRodeos, setLoadingRodeos] = useState(false);

  const [formData, setFormData] = useState({
    rp_ternero: "",
    sexo: "Macho",
    estado: "Vivo",
    id_establecimiento: userPayload?.id_establecimiento || "", // ⬅️ Auto-llenar si tiene
    peso_nacer: "",
    peso_ideal: "",
    observaciones: "",
    fecha_nacimiento: "",
    semen: "",
    id_madre: 0,
    id_rodeo: "", // ⬅️ NUEVO CAMPO
    // Campos de calostrado
    metodo_calostrado: "",
    litros_calostrado: "",
    fecha_hora_calostrado: "",
    observaciones_calostrado: "",
    grado_brix: "",
  });

  const [errors, setErrors] = useState({});
  const [terneroAlert, setTerneroAlert] = useState({
    status: false,
    message: "",
    estado: true,
  });
  const [madreId, setMadreId] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarCalostrado, setMostrarCalostrado] = useState(false);

  // ⬅️ NUEVO: Estado para establecimientos
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loadingEstablecimientos, setLoadingEstablecimientos] = useState(false);

  // ⬅️ NUEVO: Cargar establecimientos si es admin
  useEffect(() => {
    if (userPayload?.rol === "admin") {
      cargarEstablecimientos();
    }
  }, [userPayload]);

  const cargarEstablecimientos = async () => {
    try {
      setLoadingEstablecimientos(true);
      const response = await obtenerEstablecimientosHook();

      if (response?.status === 200) {
        setEstablecimientos(response.data.filter((e) => e.estado === "activo"));
      }
    } catch (error) {
      console.error("Error al cargar establecimientos:", error);
    } finally {
      setLoadingEstablecimientos(false);
    }
  };

  // ⬅️ NUEVO: Cargar rodeos al montar el componente
  useEffect(() => {
    cargarRodeos();
  }, []);

  const cargarRodeos = async () => {
    try {
      setLoadingRodeos(true);
      const response = await obtenerRodeosHook();

      if (response?.status === 200) {
        // Filtrar solo rodeos activos
        const rodeosActivos = response.data.filter(
          (r) => r.estado === "activo"
        );
        setRodeos(rodeosActivos);
      }
    } catch (error) {
      console.error("Error al cargar rodeos:", error);
      setRodeos([]);
    } finally {
      setLoadingRodeos(false);
    }
  };

  const evaluarCalidadBrix = (brix) => {
    if (!brix || brix === "") return null;
    const valor = parseFloat(brix);
    if (isNaN(valor)) return null;

    if (valor >= 22)
      return {
        calidad: "Excelente",
        color: "text-green-600",
        bg: "bg-green-50",
      };
    if (valor >= 18)
      return { calidad: "Bueno", color: "text-blue-600", bg: "bg-blue-50" };
    if (valor >= 15)
      return {
        calidad: "Regular",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
      };
    return { calidad: "Bajo", color: "text-red-600", bg: "bg-red-50" };
  };

  const handlePesoNacerChange = (e) => {
    const pesoNacer = parseFloat(e.target.value);
    setFormData((prev) => ({
      ...prev,
      peso_nacer: e.target.value,
      peso_ideal: pesoNacer > 0 ? (pesoNacer * 2).toFixed(1) : "",
    }));

    if (errors.peso_nacer) {
      setErrors((prev) => ({ ...prev, peso_nacer: undefined }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.rp_ternero) {
      newErrors.rp_ternero = "Este campo es obligatorio";
    } else if (isNaN(formData.rp_ternero) || formData.rp_ternero <= 0) {
      newErrors.rp_ternero = "Debe ser un número positivo";
    }

    if (!formData.peso_nacer) {
      newErrors.peso_nacer = "Este campo es obligatorio";
    } else if (isNaN(formData.peso_nacer) || formData.peso_nacer <= 0) {
      newErrors.peso_nacer = "Debe ser un peso válido mayor a 0";
    }

    if (!formData.observaciones?.trim()) {
      newErrors.observaciones = "Este campo es obligatorio";
    }

    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = "Este campo es obligatorio";
    }

    if (!formData.semen?.trim()) {
      newErrors.semen = "Este campo es obligatorio";
    }

    if (madreId === 0) {
      newErrors.madre = "Por favor, seleccione la madre";
    }

    if (mostrarCalostrado) {
      if (formData.metodo_calostrado && formData.litros_calostrado) {
        if (
          isNaN(formData.litros_calostrado) ||
          formData.litros_calostrado <= 0
        ) {
          newErrors.litros_calostrado = "Debe ser un número mayor a 0";
        }
      }

      if (formData.grado_brix && formData.grado_brix !== "") {
        const brix = parseFloat(formData.grado_brix);
        if (isNaN(brix) || brix < 0 || brix > 50) {
          newErrors.grado_brix = "Debe ser un número entre 0 y 50";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showAlert = (message, estado = true) => {
    setTerneroAlert({ status: true, message, estado });
    setTimeout(() => {
      setTerneroAlert({ status: false, message: "", estado: true });
    }, 5000);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      showAlert("Por favor, complete todos los campos correctamente", false);
      return;
    }

    setIsSubmitting(true);

    let newTernero = {
      rp_ternero: parseInt(formData.rp_ternero),
      sexo: formData.sexo,
      estado: formData.estado,
      peso_nacer: parseFloat(formData.peso_nacer),
      peso_15d: 0,
      peso_30d: 0,
      peso_45d: 0,
      peso_largado: parseFloat(formData.peso_nacer) * 15,
      peso_ideal: parseFloat(formData.peso_ideal),
      estimativo: "",
      observaciones: formData.observaciones.trim(),
      fecha_nacimiento: formData.fecha_nacimiento,
      semen: formData.semen.trim(),
      id_madre: madreId,
    };

    // ⬅️ NUEVO: Agregar rodeo si se seleccionó
    if (formData.id_rodeo && formData.id_rodeo !== "") {
      newTernero.id_rodeo = parseInt(formData.id_rodeo);
    }

    if (formData.metodo_calostrado && formData.litros_calostrado) {
      newTernero.metodo_calostrado = formData.metodo_calostrado;
      newTernero.litros_calostrado = parseFloat(formData.litros_calostrado);

      if (formData.fecha_hora_calostrado) {
        newTernero.fecha_hora_calostrado = formData.fecha_hora_calostrado;
      }

      if (formData.observaciones_calostrado?.trim()) {
        newTernero.observaciones_calostrado =
          formData.observaciones_calostrado.trim();
      }

      if (formData.grado_brix && formData.grado_brix !== "") {
        newTernero.grado_brix = parseFloat(formData.grado_brix);
      }
    }

    console.log("📤 Enviando ternero:", newTernero);

    try {
      const resTerneroCreado = await crearTerneroHook(newTernero);

      console.log("📥 Respuesta del servidor:", resTerneroCreado);

      console.log("🔴 Mensaje de error:", resTerneroCreado?.data?.message); // ⬅️ AGREGAR

      if (resTerneroCreado?.status === 201) {
        showAlert(
          "✅ Ternero registrado exitosamente. Ahora puedes agregar pesajes diarios desde el listado!",
          true
        );

        setTimeout(() => {
          setFormData({
            rp_ternero: "",
            sexo: "Macho",
            estado: "Vivo",
            peso_nacer: "",
            peso_ideal: "",
            observaciones: "",
            fecha_nacimiento: "",
            semen: "",
            id_madre: 0,
            id_rodeo: "", // ⬅️ RESET RODEO
            metodo_calostrado: "",
            litros_calostrado: "",
            fecha_hora_calostrado: "",
            observaciones_calostrado: "",
            grado_brix: "",
          });
          setMadreId(0);
          setErrors({});
          setMostrarCalostrado(false);
        }, 2000);
      } else if (resTerneroCreado?.status === 409) {
        const errorMessage =
          resTerneroCreado?.data?.message || resTerneroCreado?.message;

        if (
          errorMessage?.toLowerCase().includes("rp") ||
          errorMessage?.toLowerCase().includes("duplicate")
        ) {
          showAlert(
            `❌ El RP "${formData.rp_ternero}" ya está registrado. Por favor, use un RP diferente.`,
            false
          );
          setErrors({ rp_ternero: "Este RP ya existe" });
        } else {
          showAlert(
            `❌ Conflicto: ${
              errorMessage || "Ya existe un registro con estos datos"
            }`,
            false
          );
        }
      } else if (resTerneroCreado?.status === 400) {
        showAlert(
          "❌ Datos inválidos. Verifique la información ingresada.",
          false
        );
      } else if (resTerneroCreado?.status === 401) {
        showAlert(
          "❌ Sesión expirada. Por favor, inicie sesión nuevamente.",
          false
        );
      } else {
        const errorMsg =
          resTerneroCreado?.data?.message ||
          resTerneroCreado?.message ||
          "Error desconocido";
        showAlert(`❌ Error al registrar: ${errorMsg}`, false);
      }
    } catch (error) {
      console.error("🚨 Error completo:", error);

      if (error?.response?.status === 409) {
        const errorMessage = error.response.data?.message;
        if (
          errorMessage?.toLowerCase().includes("rp") ||
          errorMessage?.toLowerCase().includes("duplicate")
        ) {
          showAlert(
            `❌ El RP "${formData.rp_ternero}" ya está registrado. Use un RP diferente.`,
            false
          );
          setErrors({ rp_ternero: "Este RP ya existe" });
        } else {
          showAlert("❌ Ya existe un ternero con estos datos", false);
        }
      } else if (error?.response?.status === 401) {
        showAlert("❌ Sesión expirada. Inicie sesión nuevamente.", false);
      } else if (error?.message?.includes("Network")) {
        showAlert(
          "❌ Error de conexión. Verifique su conexión a internet.",
          false
        );
      } else {
        showAlert("❌ Error de conexión con el servidor", false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleObetenerMadre = (id) => {
    const idMadre = parseInt(id);
    setMadreId(idMadre);
    setFormData((prev) => ({ ...prev, id_madre: idMadre }));
    if (errors.madre) {
      setErrors((prev) => ({ ...prev, madre: undefined }));
    }
  };

  const evaluacionBrix = evaluarCalidadBrix(formData.grado_brix);

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 py-8'>
      <div className='bg-white p-8 rounded-lg shadow-lg w-full max-w-md'>
        <div className='mb-6 text-center'>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Registro de Ternero
          </h2>
          <p className='text-sm text-gray-600'>
            📊 Los pesos oficiales se calcularán automáticamente
          </p>
        </div>

        <form onSubmit={onSubmit} className='space-y-4'>
          {/* RP Ternero */}
          <div>
            <label
              htmlFor='rp_ternero'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              RP Ternero *{" "}
              <span className='text-xs text-gray-500'>(Debe ser único)</span>
            </label>
            <input
              type='number'
              id='rp_ternero'
              name='rp_ternero'
              value={formData.rp_ternero}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.rp_ternero ? "border-red-500" : "border-gray-300"
              }`}
              placeholder='Ej: 1001'
              min='1'
            />
            {errors.rp_ternero && (
              <span className='text-red-500 text-sm'>{errors.rp_ternero}</span>
            )}
          </div>

          {/* Sexo */}
          <div>
            <label
              htmlFor='sexo'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Sexo *
            </label>
            <select
              id='sexo'
              name='sexo'
              value={formData.sexo}
              onChange={handleInputChange}
              className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
            >
              <option value='Macho'>🐂 Macho</option>
              <option value='Hembra'>🐄 Hembra</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label
              htmlFor='estado'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Estado *
            </label>
            <select
              id='estado'
              name='estado'
              value={formData.estado}
              onChange={handleInputChange}
              className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
            >
              <option value='Vivo'>✅ Vivo</option>
              <option value='Muerto'>❌ Muerto</option>
            </select>
          </div>

          {/* ⬅️ NUEVO: SELECCIÓN DE ESTABLECIMIENTO (solo para admin) */}
          {userPayload?.rol === "admin" && (
            <div>
              <label
                htmlFor='id_establecimiento'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                🏢 Establecimiento *
              </label>
              <select
                id='id_establecimiento'
                name='id_establecimiento'
                value={formData.id_establecimiento}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.id_establecimiento
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                required
              >
                <option value=''>Seleccionar establecimiento...</option>
                {establecimientos.map((est) => (
                  <option
                    key={est.id_establecimiento}
                    value={est.id_establecimiento}
                  >
                    {est.nombre}
                  </option>
                ))}
              </select>
              {errors.id_establecimiento && (
                <span className='text-red-500 text-sm'>
                  {errors.id_establecimiento}
                </span>
              )}
            </div>
          )}

          {/* ⬅️ NUEVO: SELECCIÓN DE RODEO */}
          <div>
            <label
              htmlFor='id_rodeo'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              🐄 Rodeo (Opcional)
            </label>
            <select
              id='id_rodeo'
              name='id_rodeo'
              value={formData.id_rodeo}
              onChange={handleInputChange}
              className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
              disabled={loadingRodeos}
            >
              <option value=''>Sin rodeo asignado</option>
              {rodeos.map((rodeo) => (
                <option key={rodeo.id_rodeo} value={rodeo.id_rodeo}>
                  {rodeo.nombre} - {rodeo.tipo}
                </option>
              ))}
            </select>
            <p className='text-xs text-gray-500 mt-1'>
              💡 Puedes asignar el ternero a un rodeo específico
            </p>
          </div>

          {/* Peso al Nacer */}
          <div>
            <label
              htmlFor='peso_nacer'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Peso al Nacer (kg) *
            </label>
            <input
              type='number'
              step='0.1'
              id='peso_nacer'
              name='peso_nacer'
              value={formData.peso_nacer}
              onChange={handlePesoNacerChange}
              className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.peso_nacer ? "border-red-500" : "border-gray-300"
              }`}
              placeholder='Ej: 35.5'
              min='0.1'
            />
            {errors.peso_nacer && (
              <span className='text-red-500 text-sm'>{errors.peso_nacer}</span>
            )}
          </div>

          {/* Peso Ideal */}
          <div>
            <label
              htmlFor='peso_ideal'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Peso Ideal (Doble del peso al nacer)
            </label>
            <input
              type='number'
              step='0.1'
              id='peso_ideal'
              name='peso_ideal'
              value={formData.peso_ideal}
              readOnly
              className='w-full p-3 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none'
              placeholder='Se calcula automáticamente'
            />
            <p className='text-xs text-gray-500 mt-1'>
              🔢 Se calcula automáticamente como el doble del peso al nacer
            </p>
          </div>

          {/* Fecha de Nacimiento */}
          <div>
            <label
              htmlFor='fecha_nacimiento'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Fecha de Nacimiento *
            </label>
            <input
              type='date'
              id='fecha_nacimiento'
              name='fecha_nacimiento'
              value={formData.fecha_nacimiento}
              onChange={handleInputChange}
              max={new Date().toISOString().split("T")[0]}
              className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.fecha_nacimiento ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.fecha_nacimiento && (
              <span className='text-red-500 text-sm'>
                {errors.fecha_nacimiento}
              </span>
            )}
          </div>

          {/* Tipo de Semen */}
          <div>
            <label
              htmlFor='semen'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Tipo de Semen *
            </label>
            <input
              type='text'
              id='semen'
              name='semen'
              value={formData.semen}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.semen ? "border-red-500" : "border-gray-300"
              }`}
              placeholder='Ej: Angus Premium A123'
            />
            {errors.semen && (
              <span className='text-red-500 text-sm'>{errors.semen}</span>
            )}
          </div>

          {/* Seleccionar Madre */}
          <div>
            <label
              htmlFor='madre'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Seleccionar Madre *
            </label>
            <SeleccionarMadre madreSeleccionada={handleObetenerMadre} />
            {errors.madre && (
              <span className='text-red-500 text-sm'>{errors.madre}</span>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label
              htmlFor='observaciones'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Observaciones *
            </label>
            <textarea
              id='observaciones'
              name='observaciones'
              value={formData.observaciones}
              onChange={handleInputChange}
              rows={3}
              className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.observaciones ? "border-red-500" : "border-gray-300"
              }`}
              placeholder='Describe las condiciones del nacimiento, salud, etc.'
            />
            {errors.observaciones && (
              <span className='text-red-500 text-sm'>
                {errors.observaciones}
              </span>
            )}
          </div>

          {/* SECCIÓN DE CALOSTRADO (sin cambios) */}
          <div className='border-t pt-4'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-lg font-medium text-gray-900'>
                🍼 Información de Calostrado
              </h3>
              <button
                type='button'
                onClick={() => setMostrarCalostrado(!mostrarCalostrado)}
                className='text-sm text-indigo-600 hover:text-indigo-800'
              >
                {mostrarCalostrado ? "Ocultar" : "Agregar"}
              </button>
            </div>

            {mostrarCalostrado && (
              <div className='space-y-4 bg-blue-50 p-4 rounded-lg'>
                {/* ... resto de los campos de calostrado sin cambios ... */}
                <p className='text-sm text-blue-700'>
                  📋 Información opcional sobre la administración de calostrado
                </p>

                <div>
                  <label
                    htmlFor='metodo_calostrado'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Método de Administración
                  </label>
                  <select
                    id='metodo_calostrado'
                    name='metodo_calostrado'
                    value={formData.metodo_calostrado}
                    onChange={handleInputChange}
                    className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value=''>Seleccionar método...</option>
                    <option value='mamadera'>🍼 Mamadera</option>
                    <option value='sonda'>🩺 Sonda</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor='litros_calostrado'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Litros Administrados
                  </label>
                  <input
                    type='number'
                    step='0.1'
                    id='litros_calostrado'
                    name='litros_calostrado'
                    value={formData.litros_calostrado}
                    onChange={handleInputChange}
                    className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.litros_calostrado
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder='Ej: 2.5'
                    min='0.1'
                  />
                  {errors.litros_calostrado && (
                    <span className='text-red-500 text-sm'>
                      {errors.litros_calostrado}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor='grado_brix'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Grado Brix (°Bx) - Calidad del Calostrado
                  </label>
                  <input
                    type='number'
                    step='0.1'
                    id='grado_brix'
                    name='grado_brix'
                    value={formData.grado_brix}
                    onChange={handleInputChange}
                    className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.grado_brix ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder='Ej: 22.5'
                    min='0'
                    max='50'
                  />
                  {errors.grado_brix && (
                    <span className='text-red-500 text-sm'>
                      {errors.grado_brix}
                    </span>
                  )}

                  {evaluacionBrix && (
                    <div className={`mt-2 p-2 rounded-md ${evaluacionBrix.bg}`}>
                      <p
                        className={`text-sm font-medium ${evaluacionBrix.color}`}
                      >
                        📊 Calidad: {evaluacionBrix.calidad}
                      </p>
                    </div>
                  )}

                  <div className='mt-2 text-xs text-gray-600'>
                    <p className='font-medium mb-1'>💡 Rangos de calidad:</p>
                    <div className='grid grid-cols-2 gap-1 text-xs'>
                      <span className='text-green-600'>≥22: Excelente</span>
                      <span className='text-blue-600'>18-21.9: Bueno</span>
                      <span className='text-yellow-600'>15-17.9: Regular</span>
                      <span className='text-red-600'>&lt;15: Bajo</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor='fecha_hora_calostrado'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Fecha y Hora de Administración
                  </label>
                  <input
                    type='datetime-local'
                    id='fecha_hora_calostrado'
                    name='fecha_hora_calostrado'
                    value={formData.fecha_hora_calostrado}
                    onChange={handleInputChange}
                    className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  />
                </div>

                <div>
                  <label
                    htmlFor='observaciones_calostrado'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Observaciones del Calostrado
                  </label>
                  <textarea
                    id='observaciones_calostrado'
                    name='observaciones_calostrado'
                    value={formData.observaciones_calostrado}
                    onChange={handleInputChange}
                    rows={2}
                    className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    placeholder='Ej: Se administró sin problemas, el ternero lo aceptó bien'
                  />
                </div>
              </div>
            )}
          </div>

          {/* Información sobre el sistema */}
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
            <h4 className='font-medium text-blue-900 mb-2'>
              📊 Sistema Automático
            </h4>
            <ul className='text-sm text-blue-700 space-y-1'>
              <li>
                • Los pesos oficiales (15d, 30d, 45d) se calcularán
                automáticamente
              </li>
              <li>
                • Registra pesajes diarios desde el listado para mayor precisión
              </li>
              <li>• El RP debe ser único para cada ternero</li>
              <li>
                • La asignación a rodeo, calostrado y grado Brix son opcionales
              </li>
            </ul>
          </div>

          {/* Botón Submit */}
          <div className='pt-4'>
            <button
              type='submit'
              disabled={isSubmitting}
              className={`w-full py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                isSubmitting
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {isSubmitting ? (
                <div className='flex items-center justify-center'>
                  <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                  Registrando...
                </div>
              ) : (
                "🐄 Registrar Ternero"
              )}
            </button>
          </div>
        </form>

        {/* Alert Message */}
        {terneroAlert.status && (
          <div
            className={`mt-4 p-3 rounded-md text-center font-medium ${
              terneroAlert.estado
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {terneroAlert.message}
          </div>
        )}

        {/* Debug Info - Solo en desarrollo */}
        {process.env.NODE_ENV === "development" && (
          <div className='mt-4 p-3 bg-gray-100 rounded-md text-xs'>
            <strong>Debug Info:</strong>
            <pre className='mt-1 text-gray-600'>
              {JSON.stringify(
                {
                  rp_ternero: formData.rp_ternero,
                  peso_nacer: formData.peso_nacer,
                  id_madre: madreId,
                  id_rodeo: formData.id_rodeo, // ⬅️ AGREGADO
                  calostrado: {
                    metodo: formData.metodo_calostrado,
                    litros: formData.litros_calostrado,
                    grado_brix: formData.grado_brix,
                  },
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormularioTernero;
