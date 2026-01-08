import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const FormularioTratamiento = ({ setStep }) => {
  const {
    crearTratamientoHook,
    crearMultiplesTratamientosHook,
    obtenerEstablecimientosHook,
  } = useBussinesMicroservicio();

  // Obtener datos del Redux
  const { establecimientoActual, userPayload } = useSelector(
    (state) => state.auth
  );

  const [tratamientoAlert, setTratamientoAlert] = useState({
    status: false,
    message: "",
    estado: true,
  });

  // Estado para establecimientos (solo admin)
  const [establecimientos, setEstablecimientos] = useState([]);
  const establecimientosCargadosRef = useRef(false);

  // Estado para modo múltiple
  const [modoMultiple, setModoMultiple] = useState(false);
  const [tratamientos, setTratamientos] = useState([
    {
      nombre: "",
      descripcion: "",
      tipo_enfermedad: "",
      turno: "",
      fecha_tratamiento: new Date().toISOString().split("T")[0],
    },
  ]);
  const [loadingMultiple, setLoadingMultiple] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  // Cargar establecimientos si es admin
  useEffect(() => {
    const cargarEstablecimientos = async () => {
      if (establecimientosCargadosRef.current) {
        console.log("⏭️ Establecimientos ya cargados, saltando...");
        return;
      }

      console.log("🔍 Verificando carga de establecimientos...");
      console.log("👤 userPayload:", userPayload);

      if (userPayload?.rol === "admin") {
        console.log("✅ Es admin, cargando establecimientos...");
        establecimientosCargadosRef.current = true;

        try {
          const response = await obtenerEstablecimientosHook();
          console.log("📡 Response:", response?.data);

          if (response?.data) {
            const establecimientosActivos = response.data.filter(
              (est) => est.estado === "activo"
            );

            const establecimientosUnicos = Array.from(
              new Map(
                establecimientosActivos.map((est) => [
                  est.id_establecimiento,
                  est,
                ])
              ).values()
            );

            console.log(
              "✅ Establecimientos únicos y activos:",
              establecimientosUnicos.length
            );
            setEstablecimientos(establecimientosUnicos);
          }
        } catch (error) {
          console.error("❌ Error cargando establecimientos:", error);
          establecimientosCargadosRef.current = false;
        }
      }
    };

    cargarEstablecimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opciones para tipo de enfermedad
  const tiposEnfermedadSugerencias = [
    "Diarrea",
    "Diarrea bacteriana",
    "Diarrea viral",
    "Neumonía",
    "Problemas respiratorios",
    "Deshidratación",
    "Deshidratación severa",
    "Infección ocular",
    "Problemas digestivos",
    "Fiebre",
    "Heridas externas",
    "Parásitos internos",
    "Vitaminas y suplementos",
    "otro",
  ];

  const turnosTratamiento = [
    { value: "mañana", label: "🌅 Mañana" },
    { value: "tarde", label: "🌆 Tarde" },
  ];

  const tipoEnfermedadSeleccionado = watch("tipo_enfermedad");

  const showAlert = (message, estado = true) => {
    setTratamientoAlert({ status: true, message, estado });
    setTimeout(() => {
      setTratamientoAlert({ status: false, message: "", estado: true });
    }, 5000);
  };

  const onSubmit = async (data) => {
    let newTratamiento = {
      nombre: data.nombre,
      descripcion: data.descripcion,
      tipo_enfermedad: data.tipo_enfermedad,
      turno: data.turno,
      fecha_tratamiento: data.fecha_tratamiento,
    };

    if (userPayload?.rol === "admin" && data.id_establecimiento) {
      newTratamiento.id_establecimiento = parseInt(data.id_establecimiento);
    }

    console.log("📤 Datos a enviar:", newTratamiento);

    const resCrearTratamiento = await crearTratamientoHook(newTratamiento);
    if (resCrearTratamiento?.status == 201) {
      showAlert("✅ SE HA REGISTRADO CORRECTAMENTE EL TRATAMIENTO", true);
      reset();
    } else {
      showAlert("❌ ERROR 401, SESSION CADUCADA", false);
      reset();
    }
  };

  const agregarTratamiento = () => {
    setTratamientos([
      ...tratamientos,
      {
        nombre: "",
        descripcion: "",
        tipo_enfermedad: "",
        turno: "",
        fecha_tratamiento: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const eliminarTratamiento = (index) => {
    if (tratamientos.length > 1) {
      const nuevos = tratamientos.filter((_, i) => i !== index);
      setTratamientos(nuevos);
    }
  };

  const actualizarTratamiento = (index, campo, valor) => {
    const nuevos = tratamientos.map((tratamiento, i) =>
      i === index ? { ...tratamiento, [campo]: valor } : tratamiento
    );
    setTratamientos(nuevos);
  };

  const duplicarTratamiento = (index) => {
    const tratamientoDuplicado = { ...tratamientos[index] };
    tratamientoDuplicado.nombre = `${tratamientoDuplicado.nombre} (Copia)`;
    const nuevos = [...tratamientos];
    nuevos.splice(index + 1, 0, tratamientoDuplicado);
    setTratamientos(nuevos);
  };

  const validarTratamientosMultiples = () => {
    return tratamientos.every(
      (tratamiento) =>
        tratamiento.nombre.trim() &&
        tratamiento.descripcion.trim() &&
        tratamiento.tipo_enfermedad &&
        tratamiento.turno &&
        tratamiento.fecha_tratamiento
    );
  };

  const onSubmitMultiple = async () => {
    if (!validarTratamientosMultiples()) {
      showAlert("❌ Por favor completa todos los campos", false);
      return;
    }

    setLoadingMultiple(true);

    try {
      const payload = { tratamientos };
      if (userPayload?.rol === "admin" && establecimientoActual) {
        payload.id_establecimiento = establecimientoActual;
      }

      console.log("📤 Enviando múltiples tratamientos:", payload);
      const resultado = await crearMultiplesTratamientosHook(payload);

      if (resultado?.status === 201 || resultado?.status === 200) {
        const data = resultado.data;
        if (data.errores && data.errores.length > 0) {
          showAlert(
            `✅ Se crearon ${data.total_creados} de ${tratamientos.length} tratamientos. ${data.errores.length} fallaron.`,
            true
          );
        } else {
          showAlert(
            `✅ Se crearon ${data.total_creados} tratamientos exitosamente`,
            true
          );
          setTratamientos([
            {
              nombre: "",
              descripcion: "",
              tipo_enfermedad: "",
              turno: "",
              fecha_tratamiento: new Date().toISOString().split("T")[0],
            },
          ]);
        }
      } else if (resultado?.status === 401) {
        showAlert("❌ Sesión expirada", false);
      } else {
        showAlert(
          `❌ Error: ${resultado?.data?.message || "Desconocido"}`,
          false
        );
      }
    } catch (error) {
      console.error("🚨 Error:", error);
      showAlert("❌ Error de conexión", false);
    } finally {
      setLoadingMultiple(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl mb-10 mt-10'>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-2xl font-bold'>
            {modoMultiple
              ? "💊 Crear Múltiples Tratamientos"
              : "💊 Formulario Tratamiento"}
          </h2>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-gray-600'>Modo:</span>
            <button
              type='button'
              onClick={() => setModoMultiple(!modoMultiple)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                modoMultiple
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {modoMultiple ? "📋 Múltiple" : "📄 Individual"}
            </button>
          </div>
        </div>

        {userPayload?.rol === "admin" && modoMultiple && (
          <div className='mb-6 p-4 rounded-lg border-l-4 border-orange-500 bg-orange-50'>
            <label className='block text-sm font-medium text-orange-700 mb-2'>
              🏢 Establecimiento (obligatorio para admin)
            </label>
            <p className='text-xs text-orange-600 mb-2'>
              Selecciona el establecimiento donde se crearán estos tratamientos
            </p>
            {!establecimientoActual && (
              <p className='text-xs text-red-600 font-medium mb-2'>
                ⚠️ Debes seleccionar un establecimiento en el selector principal
              </p>
            )}
            <div className='text-sm text-orange-700'>
              <strong>Establecimiento actual:</strong>{" "}
              {establecimientoActual
                ? establecimientos.find(
                    (e) => e.id_establecimiento === establecimientoActual
                  )?.nombre_establecimiento || "Desconocido"
                : "Ninguno seleccionado"}
            </div>
          </div>
        )}

        <div className='mb-6 p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50'>
          <p className='text-sm text-blue-700'>
            {modoMultiple
              ? "📋 Modo Múltiple: Puedes crear varios tratamientos a la vez."
              : "📄 Modo Individual: Crea un tratamiento por vez."}
          </p>
        </div>

        {!modoMultiple ? (
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            {userPayload?.rol === "admin" && (
              <div className='p-4 bg-orange-50 border border-orange-200 rounded-lg'>
                <label
                  className='block text-gray-700 font-medium mb-2'
                  htmlFor='id_establecimiento'
                >
                  🏢 Establecimiento *
                </label>
                <div className='mb-2 p-2 bg-gray-100 rounded text-xs'>
                  <p>Establecimientos cargados: {establecimientos.length}</p>
                  <p>
                    Establecimiento actual Redux:{" "}
                    {establecimientoActual || "Ninguno"}
                  </p>
                </div>
                <select
                  id='id_establecimiento'
                  {...register("id_establecimiento", {
                    required: "Debes seleccionar un establecimiento",
                  })}
                  className='w-full px-4 py-2 border rounded-md focus:ring focus:ring-orange-300 bg-white'
                  defaultValue={establecimientoActual || ""}
                >
                  <option value=''>Selecciona un establecimiento</option>
                  {establecimientos.map((est) => (
                    <option
                      key={est.id_establecimiento}
                      value={est.id_establecimiento}
                    >
                      {est.nombre_establecimiento ||
                        est.nombre ||
                        `Establecimiento ${est.id_establecimiento}`}
                    </option>
                  ))}
                </select>
                {errors.id_establecimiento && (
                  <span className='text-red-500 text-sm'>
                    {errors.id_establecimiento.message}
                  </span>
                )}
                <p className='text-xs text-orange-600 mt-1'>
                  ℹ️ Como admin, debes especificar a qué establecimiento
                  pertenece este tratamiento
                </p>
              </div>
            )}

            <div>
              <label className='block text-gray-600' htmlFor='nombre'>
                Nombre del Tratamiento *
              </label>
              <input
                type='text'
                id='nombre'
                {...register("nombre", {
                  required: "Este campo es obligatorio",
                })}
                className='w-full px-4 py-2 mt-2 border rounded-md focus:ring focus:ring-indigo-300'
                placeholder='Ej: Antibiótico Amoxicilina'
              />
              {errors.nombre && (
                <span className='text-red-500'>{errors.nombre.message}</span>
              )}
            </div>

            <div>
              <label className='block text-gray-600' htmlFor='descripcion'>
                Descripción *
              </label>
              <textarea
                id='descripcion'
                rows='3'
                {...register("descripcion", {
                  required: "Este campo es obligatorio",
                })}
                className='w-full px-4 py-2 mt-2 border rounded-md focus:ring focus:ring-indigo-300 resize-none'
                placeholder={
                  tipoEnfermedadSeleccionado === "otro"
                    ? "Especifica el tipo de enfermedad no listada..."
                    : "Describe el tratamiento"
                }
              />
              {errors.descripcion && (
                <span className='text-red-500'>
                  {errors.descripcion.message}
                </span>
              )}
              {tipoEnfermedadSeleccionado === "otro" && (
                <div className='mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md'>
                  <p className='text-sm text-yellow-800'>
                    💡 <strong>Has seleccionado "Otro":</strong> Especifica el
                    tipo de enfermedad en la descripción
                  </p>
                </div>
              )}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label
                  className='block text-gray-600'
                  htmlFor='tipo_enfermedad'
                >
                  Tipo de Enfermedad *
                </label>
                <select
                  id='tipo_enfermedad'
                  {...register("tipo_enfermedad", {
                    required: "Debes seleccionar un tipo",
                  })}
                  className='w-full px-4 py-2 mt-2 border rounded-md focus:ring focus:ring-indigo-300 bg-white'
                >
                  <option value=''>Selecciona un tipo</option>
                  {tiposEnfermedadSugerencias.map((tipo, index) => (
                    <option key={index} value={tipo}>
                      {tipo === "otro" ? "➕ Otro (especificar)" : tipo}
                    </option>
                  ))}
                </select>
                {errors.tipo_enfermedad && (
                  <span className='text-red-500'>
                    {errors.tipo_enfermedad.message}
                  </span>
                )}
              </div>

              <div>
                <label className='block text-gray-600' htmlFor='turno'>
                  Turno *
                </label>
                <select
                  id='turno'
                  {...register("turno", {
                    required: "Debes seleccionar un turno",
                  })}
                  className='w-full px-4 py-2 mt-2 border rounded-md focus:ring focus:ring-indigo-300 bg-white'
                >
                  <option value=''>Selecciona un turno</option>
                  {turnosTratamiento.map((turno) => (
                    <option key={turno.value} value={turno.value}>
                      {turno.label}
                    </option>
                  ))}
                </select>
                {errors.turno && (
                  <span className='text-red-500'>{errors.turno.message}</span>
                )}
              </div>
            </div>

            <div>
              <label
                className='block text-gray-600'
                htmlFor='fecha_tratamiento'
              >
                Fecha *
              </label>
              <input
                type='date'
                id='fecha_tratamiento'
                {...register("fecha_tratamiento", {
                  required: "Este campo es obligatorio",
                })}
                className='w-full px-4 py-2 mt-2 border rounded-md focus:ring focus:ring-indigo-300'
              />
              {errors.fecha_tratamiento && (
                <span className='text-red-500'>
                  {errors.fecha_tratamiento.message}
                </span>
              )}
            </div>

            <div className='flex justify-between mt-6'>
              <button
                type='button'
                onClick={() => setStep((prevStep) => prevStep - 1)}
                className='px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600'
              >
                Atrás
              </button>
              <button
                type='submit'
                className='px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700'
              >
                💾 Guardar
              </button>
            </div>
          </form>
        ) : (
          <div className='space-y-6'>
            <div className='space-y-4'>
              {tratamientos.map((tratamiento, index) => (
                <div
                  key={index}
                  className='border border-gray-300 rounded-lg p-4 bg-gray-50'
                >
                  <div className='flex items-center justify-between mb-4'>
                    <h4 className='font-medium text-gray-800'>
                      Tratamiento #{index + 1}
                    </h4>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => duplicarTratamiento(index)}
                        className='text-blue-600 hover:text-blue-700 text-sm'
                      >
                        📋 Duplicar
                      </button>
                      {tratamientos.length > 1 && (
                        <button
                          type='button'
                          onClick={() => eliminarTratamiento(index)}
                          className='text-red-600 hover:text-red-700 text-sm'
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Nombre *
                      </label>
                      <input
                        type='text'
                        value={tratamiento.nombre}
                        onChange={(e) =>
                          actualizarTratamiento(index, "nombre", e.target.value)
                        }
                        className='w-full p-3 border border-gray-300 rounded-md'
                        placeholder='Ej: Antibiótico'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Tipo *
                      </label>
                      <select
                        value={tratamiento.tipo_enfermedad}
                        onChange={(e) =>
                          actualizarTratamiento(
                            index,
                            "tipo_enfermedad",
                            e.target.value
                          )
                        }
                        className='w-full p-3 border border-gray-300 rounded-md'
                      >
                        <option value=''>Selecciona</option>
                        {tiposEnfermedadSugerencias.map((tipo, tipoIndex) => (
                          <option key={tipoIndex} value={tipo}>
                            {tipo === "otro" ? "➕ Otro" : tipo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Turno *
                      </label>
                      <select
                        value={tratamiento.turno}
                        onChange={(e) =>
                          actualizarTratamiento(index, "turno", e.target.value)
                        }
                        className='w-full p-3 border border-gray-300 rounded-md'
                      >
                        <option value=''>Selecciona</option>
                        {turnosTratamiento.map((turno) => (
                          <option key={turno.value} value={turno.value}>
                            {turno.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Fecha *
                      </label>
                      <input
                        type='date'
                        value={tratamiento.fecha_tratamiento}
                        onChange={(e) =>
                          actualizarTratamiento(
                            index,
                            "fecha_tratamiento",
                            e.target.value
                          )
                        }
                        className='w-full p-3 border border-gray-300 rounded-md'
                      />
                    </div>

                    <div className='md:col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Descripción *
                      </label>
                      <textarea
                        value={tratamiento.descripcion}
                        onChange={(e) =>
                          actualizarTratamiento(
                            index,
                            "descripcion",
                            e.target.value
                          )
                        }
                        className='w-full p-3 border border-gray-300 rounded-md'
                        rows='3'
                        placeholder={
                          tratamiento.tipo_enfermedad === "otro"
                            ? "Especifica el tipo de enfermedad..."
                            : "Describe el tratamiento"
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className='text-center'>
              <button
                type='button'
                onClick={agregarTratamiento}
                className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md'
              >
                ➕ Agregar
              </button>
            </div>

            <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
              <h3 className='font-medium text-gray-800 mb-2'>📊 Resumen</h3>
              <p className='text-sm text-gray-600'>
                <strong>Total:</strong> {tratamientos.length}
              </p>
            </div>

            <div className='flex gap-4 pt-4'>
              <button
                type='button'
                onClick={() => setStep((prevStep) => prevStep - 1)}
                disabled={loadingMultiple}
                className='bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-md disabled:opacity-50'
              >
                Atrás
              </button>
              <button
                type='button'
                onClick={onSubmitMultiple}
                disabled={
                  loadingMultiple ||
                  !validarTratamientosMultiples() ||
                  (userPayload?.rol === "admin" && !establecimientoActual)
                }
                className='flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-md disabled:opacity-50'
              >
                {loadingMultiple ? (
                  <div className='flex items-center justify-center'>
                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                    Creando...
                  </div>
                ) : (
                  `💾 Crear ${tratamientos.length} Tratamiento${
                    tratamientos.length > 1 ? "s" : ""
                  }`
                )}
              </button>
            </div>
          </div>
        )}

        {tratamientoAlert.status && (
          <div
            className={`mt-4 p-3 rounded-md text-center font-medium ${
              tratamientoAlert.estado
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {tratamientoAlert.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormularioTratamiento;
