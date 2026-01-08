import { useForm } from "react-hook-form";
import React, { useState, useEffect } from "react"; // ✅ Agregar useEffect
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector } from "react-redux"; // ✅ NUEVO
import SeleccionarMadre from "./Select-Madre";
import SeleccionarTernero from "./Select-Ternero";

const FormularioEvento = ({ setStep }) => {
  // ✅ NUEVO: Obtener datos del usuario
  const { userPayload } = useSelector((state) => state.auth);
  const {
    crearMultiplesEventosHook,
    obtenerEstablecimientosHook, // ✅ NUEVO
  } = useBussinesMicroservicio();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [eventoAlert, setEventoAlert] = useState({
    status: false,
    message: "",
    estado: true,
  });
  const [terneros, setTerneros] = useState([]);
  const [madres, setMadres] = useState([]);
  const [eventosAcumulados, setEventosAcumulados] = useState([]);
  const [cargandoEnvio, setCargandoEnvio] = useState(false);

  // ✅ NUEVO: Estados para establecimientos
  const [establecimientos, setEstablecimientos] = useState([]);
  const [idEstablecimiento, setIdEstablecimiento] = useState(
    userPayload?.rol === "admin" ? "" : userPayload?.id_establecimiento
  );

  const [resetKey, setResetKey] = useState(0);

  // ✅ NUEVO: Cargar establecimientos si es admin
  useEffect(() => {
    if (userPayload?.rol === "admin") {
      cargarEstablecimientos();
    }
  }, [userPayload]);

  const cargarEstablecimientos = async () => {
    try {
      const response = await obtenerEstablecimientosHook();
      if (response?.status === 200) {
        setEstablecimientos(response.data.filter((e) => e.estado === "activo"));
      }
    } catch (error) {
      console.error("Error al cargar establecimientos:", error);
    }
  };

  const handleObetenerMadre = (id) => {
    const idMadre = parseInt(id);
    if (idMadre > 0 && !madres.includes(idMadre)) {
      setMadres([...madres, idMadre]);
    }
  };

  const handleObetenerTernero = (id) => {
    const idTernero = parseInt(id);
    if (idTernero > 0 && !terneros.includes(idTernero)) {
      setTerneros([...terneros, idTernero]);
    }
  };

  const limpiarFormulario = () => {
    reset();
    setTerneros([]);
    setMadres([]);
    setResetKey((prev) => prev + 1); // ← Forzar reset de selectores
    setEventoAlert({ status: false, message: "", estado: true });
  };

  const agregarEvento = async (data) => {
    // ✅ NUEVA VALIDACIÓN: Verificar establecimiento
    if (userPayload?.rol === "admin" && !idEstablecimiento) {
      setEventoAlert({
        status: true,
        message: "POR FAVOR, SELECCIONE UN ESTABLECIMIENTO",
        estado: false,
      });
      return;
    }

    // Validaciones
    if (terneros.length === 0) {
      setEventoAlert({
        status: true,
        message: "POR FAVOR, INGRESAR AL MENOS UN TERNERO",
        estado: false,
      });
      return;
    }

    if (madres.length === 0) {
      setEventoAlert({
        status: true,
        message: "POR FAVOR, INGRESAR AL MENOS UNA MADRE",
        estado: false,
      });
      return;
    }

    const nuevoEvento = {
      id: Date.now(), // ID temporal para la lista
      fecha_evento: data.fecha_evento,
      observacion: data.observacion,
      id_ternero: [...terneros],
      id_madre: [...madres],
      // Para mostrar en la lista
      fecha_display: data.fecha_evento,
      terneros_count: terneros.length,
      madres_count: madres.length,
    };

    setEventosAcumulados([...eventosAcumulados, nuevoEvento]);
    setEventoAlert({
      status: true,
      message: `EVENTO AGREGADO (${
        eventosAcumulados.length + 1
      } eventos en total)`,
      estado: true,
    });

    limpiarFormulario();
  };

  const eliminarEvento = (eventoId) => {
    const eventosActualizados = eventosAcumulados.filter(
      (evento) => evento.id !== eventoId
    );
    setEventosAcumulados(eventosActualizados);
    setEventoAlert({
      status: true,
      message: "EVENTO ELIMINADO DE LA LISTA",
      estado: true,
    });
  };

  const enviarTodosLosEventos = async () => {
    if (eventosAcumulados.length === 0) {
      setEventoAlert({
        status: true,
        message: "NO HAY EVENTOS PARA ENVIAR. AGREGUE AL MENOS UN EVENTO",
        estado: false,
      });
      return;
    }

    // ✅ VALIDACIÓN FINAL: Verificar establecimiento antes de enviar
    if (userPayload?.rol === "admin" && !idEstablecimiento) {
      setEventoAlert({
        status: true,
        message: "DEBE SELECCIONAR UN ESTABLECIMIENTO ANTES DE ENVIAR",
        estado: false,
      });
      return;
    }

    setCargandoEnvio(true);

    // ✅ CORRECCIÓN: Preparar eventos con id_establecimiento
    const eventosParaEnviar = {
      eventos: eventosAcumulados.map((evento) => ({
        fecha_evento: evento.fecha_evento,
        observacion: evento.observacion,
        id_ternero: evento.id_ternero,
        id_madre: evento.id_madre,
      })),
      // ✅ AGREGAR: id_establecimiento al nivel del DTO principal
      id_establecimiento:
        userPayload?.rol === "admin"
          ? parseInt(idEstablecimiento)
          : userPayload?.id_establecimiento,
    };

    console.log("📤 Enviando eventos:", eventosParaEnviar);

    try {
      const respuesta = await crearMultiplesEventosHook(eventosParaEnviar);

      if (respuesta?.status === 201) {
        setEventoAlert({
          status: true,
          message: `¡ÉXITO! SE REGISTRARON ${eventosAcumulados.length} EVENTOS CORRECTAMENTE`,
          estado: true,
        });
        setEventosAcumulados([]);
        limpiarFormulario();
      } else {
        setEventoAlert({
          status: true,
          message: "ERROR AL REGISTRAR LOS EVENTOS. INTENTE NUEVAMENTE",
          estado: false,
        });
      }
    } catch (error) {
      console.error("❌ Error completo:", error);
      console.error("❌ Error response:", error.response);
      console.error("❌ Error data:", error.response?.data);

      setEventoAlert({
        status: true,
        message: error.response?.data?.message || "ERROR AL REGISTRAR",
        estado: false,
      });
    } finally {
      setCargandoEnvio(false);
    }
  };

  const limpiarTodoEventos = () => {
    setEventosAcumulados([]);
    limpiarFormulario();
    setEventoAlert({
      status: true,
      message: "LISTA DE EVENTOS LIMPIADA",
      estado: true,
    });
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 p-4'>
      <div className='bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl'>
        <h2 className='text-3xl font-bold text-center mb-6 text-gray-800'>
          Registro de Múltiples Eventos
        </h2>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* FORMULARIO */}
          <div className='space-y-6'>
            <h3 className='text-xl font-semibold text-gray-700 border-b pb-2'>
              Agregar Nuevo Evento
            </h3>

            <form onSubmit={handleSubmit(agregarEvento)} className='space-y-4'>
              {/* ✅ NUEVO: SELECTOR DE ESTABLECIMIENTO (solo para admin) */}
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
                    value={idEstablecimiento}
                    onChange={(e) => setIdEstablecimiento(e.target.value)}
                    className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
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
                </div>
              )}

              <div>
                <label
                  htmlFor='fecha_evento'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Fecha del Evento
                </label>
                <input
                  type='date'
                  id='fecha_evento'
                  {...register("fecha_evento", {
                    required: "Este campo es obligatorio",
                  })}
                  className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
                />
                {errors.fecha_evento && (
                  <span className='text-red-500 text-sm'>
                    {errors.fecha_evento.message}
                  </span>
                )}
              </div>

              <div>
                <label
                  htmlFor='observacion'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Observaciones
                </label>
                <textarea
                  id='observacion'
                  {...register("observacion", {
                    required: "Este campo es obligatorio",
                  })}
                  placeholder='Observaciones del evento...'
                  rows='3'
                  className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
                />
                {errors.observacion && (
                  <span className='text-red-500 text-sm'>
                    {errors.observacion.message}
                  </span>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Seleccionar Terneros
                </label>
                {/* ✅ PASAR idEstablecimiento */}
                <SeleccionarTernero
                  key={`ternero-${resetKey}`} // ← Agregar esto
                  terneroSeleccionado={handleObetenerTernero}
                  idEstablecimiento={idEstablecimiento}
                />
                {terneros.length > 0 && (
                  <p className='text-sm text-green-600 mt-1'>
                    ✓ {terneros.length} ternero(s) seleccionado(s)
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Seleccionar Madres
                </label>
                {/* ✅ PASAR idEstablecimiento */}
                <SeleccionarMadre
                  key={`madre-${resetKey}`} // ← Agregar esto
                  madreSeleccionada={handleObetenerMadre}
                  idEstablecimiento={idEstablecimiento}
                />
                {madres.length > 0 && (
                  <p className='text-sm text-green-600 mt-1'>
                    ✓ {madres.length} madre(s) seleccionada(s)
                  </p>
                )}
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  type='submit'
                  className='flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors'
                >
                  ➕ Agregar a la Lista
                </button>
                <button
                  type='button'
                  onClick={limpiarFormulario}
                  className='px-4 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors'
                >
                  🗑️ Limpiar
                </button>
              </div>
            </form>
          </div>

          {/* LISTA DE EVENTOS */}
          <div className='space-y-6'>
            <div className='flex justify-between items-center border-b pb-2'>
              <h3 className='text-xl font-semibold text-gray-700'>
                Eventos Preparados ({eventosAcumulados.length})
              </h3>
              {eventosAcumulados.length > 0 && (
                <button
                  onClick={limpiarTodoEventos}
                  className='text-sm text-red-600 hover:text-red-800 font-medium'
                >
                  Limpiar Todo
                </button>
              )}
            </div>

            {eventosAcumulados.length === 0 ? (
              <div className='text-center py-8 text-gray-500'>
                <p className='text-lg mb-2'>📋 No hay eventos agregados</p>
                <p className='text-sm'>
                  Complete el formulario y haga clic en "Agregar a la Lista"
                </p>
              </div>
            ) : (
              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {eventosAcumulados.map((evento, index) => (
                  <div
                    key={evento.id}
                    className='bg-gray-50 p-4 rounded-lg border border-gray-200'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <span className='font-semibold text-gray-800'>
                        Evento #{index + 1}
                      </span>
                      <button
                        onClick={() => eliminarEvento(evento.id)}
                        className='text-red-500 hover:text-red-700 font-bold text-lg'
                        title='Eliminar evento'
                      >
                        ✕
                      </button>
                    </div>
                    <div className='text-sm text-gray-600 space-y-1'>
                      <p>
                        <strong>Fecha:</strong> {evento.fecha_display}
                      </p>
                      <p>
                        <strong>Observación:</strong> {evento.observacion}
                      </p>
                      <p>
                        <strong>Terneros:</strong> {evento.terneros_count}{" "}
                        seleccionados
                      </p>
                      <p>
                        <strong>Madres:</strong> {evento.madres_count}{" "}
                        seleccionadas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BOTONES DE ACCIÓN FINAL */}
            {eventosAcumulados.length > 0 && (
              <div className='space-y-3 pt-4 border-t'>
                <button
                  onClick={enviarTodosLosEventos}
                  disabled={cargandoEnvio}
                  className={`w-full py-4 font-bold text-white rounded-lg shadow-lg transition-all transform hover:scale-105 ${
                    cargandoEnvio
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  }`}
                >
                  {cargandoEnvio ? (
                    <span className='flex items-center justify-center'>
                      <svg
                        className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                      >
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                        ></circle>
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        ></path>
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    `🚀 Registrar ${eventosAcumulados.length} Eventos`
                  )}
                </button>

                <p className='text-xs text-center text-gray-500'>
                  Se registrarán todos los eventos de la lista en una sola
                  operación
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ALERTAS */}
        {eventoAlert.status && (
          <div
            className={`mt-6 p-4 rounded-lg shadow-md text-center font-semibold ${
              eventoAlert.estado
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {eventoAlert.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormularioEvento;
