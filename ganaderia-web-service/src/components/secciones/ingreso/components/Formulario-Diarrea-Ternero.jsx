import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useBussinesMicroservicio } from "@/hooks/bussines";
import { useSelector, useDispatch } from "react-redux";
import { setUserData, setAuthPayload, setStatus } from "@/store/auth";
import SeleccionarTernero from "./Select-Ternero";

const FormularioDiarreaTernero = ({ setStep }) => {
  const { crearDiarreTerneroHook, obtenerDiarreaTerneroHook } =
    useBussinesMicroservicio();

  // ✅ NUEVO: Redux para multi-tenancy
  const { establecimientoActual, userPayload } = useSelector(
    (state) => state.auth
  );

  const dispatch = useDispatch();

  useEffect(() => {
    // Verificar que estamos en el cliente (navegador)
    if (typeof window === "undefined") return;

    const userSelected = localStorage.getItem("userSelected");
    const token = localStorage.getItem("token");

    if (userSelected && token) {
      try {
        const userData = JSON.parse(userSelected);
        console.log("🔄 Cargando usuario desde localStorage:", userData);

        dispatch(setUserData(userData));
        dispatch(setAuthPayload(token));
        dispatch(setStatus("authenticated"));
      } catch (error) {
        console.error("❌ Error:", error);
      }
    }
  }, [dispatch]);

  // ✅ AGREGAR ESTAS LÍNEAS DE DEBUG:
  console.log(
    "🧪 FULL Redux State:",
    useSelector((state) => state)
  );
  console.log(
    "🧪 Auth State:",
    useSelector((state) => state.auth)
  );
  console.log("🧪 userPayload COMPLETO:", JSON.stringify(userPayload, null, 2));

  const [diarreaTerneroAlert, setDiarreaTerneroAlert] = useState({
    status: false,
    message: "",
    estado: true,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [fechaDiarrea, setFechaDiarrea] = useState("");
  const [severidad, setSeveridad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [terneroId, setTerneroId] = useState(0);
  const [episodiosAnteriores, setEpisodiosAnteriores] = useState(0);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [cargando, setCargando] = useState(false);

  // El establecimiento sale del selector del navbar (admin) o del usuario (operario).
  const establecimientoSeleccionado =
    establecimientoActual || userPayload?.id_establecimiento || "";

  // Opciones de severidad predefinidas
  const opcionesSeveridad = [
    { value: "", label: "Seleccionar severidad..." },
    { value: "Leve", label: "Leve - Heces blandas ocasionales" },
    {
      value: "Moderada",
      label: "Moderada - Diarrea frecuente, hidratación normal",
    },
    {
      value: "Severa",
      label: "Severa - Diarrea persistente, signos de deshidratación",
    },
    {
      value: "Crítica",
      label: "Crítica - Diarrea severa, deshidratación grave",
    },
  ];

  const handleTerneroId = async (id) => {
    const idTernero = parseInt(id);
    setTerneroId(idTernero);

    // ✅ MEJORADO: Buscar historial filtrado por establecimiento
    if (idTernero > 0) {
      setCargandoHistorial(true);
      try {
        // Construir query params
        const queryParams = new URLSearchParams();

        if (establecimientoSeleccionado) {
          queryParams.append("id_establecimiento", establecimientoSeleccionado);
        }

        const historial = await obtenerDiarreaTerneroHook(
          queryParams.toString()
        );

        if (historial?.data) {
          // Filtrar episodios de este ternero específico
          const episodiosTernero = historial.data.filter(
            (episodio) => episodio.ternero?.id_ternero === idTernero
          );
          setEpisodiosAnteriores(episodiosTernero.length);
        }
      } catch (error) {
        console.warn("No se pudo obtener el historial:", error);
        setEpisodiosAnteriores(0);
      } finally {
        setCargandoHistorial(false);
      }
    } else {
      setEpisodiosAnteriores(0);
    }
  };

  const limpiarFormulario = () => {
    setFechaDiarrea("");
    setSeveridad("");
    setObservaciones("");
    setTerneroId(0);
    setEpisodiosAnteriores(0);
    reset();
    setDiarreaTerneroAlert({ status: false, message: "", estado: true });
  };

  // Maneja el submit y envía los datos
  const onSubmit = async () => {
    console.log("🎯 SUBMIT EJECUTADO"); // ✅ AGREGAR ESTO TAMBIÉN
    setCargando(true);

    // ✅ NUEVA VALIDACIÓN: Establecimiento
    if (!establecimientoSeleccionado) {
      setDiarreaTerneroAlert({
        status: true,
        message: "ELEGÍ UN ESTABLECIMIENTO ARRIBA ANTES DE CARGAR",
        estado: false,
      });
      setCargando(false);
      return;
    }

    // Validaciones existentes
    if (terneroId === 0) {
      setDiarreaTerneroAlert({
        status: true,
        message: "ERROR: DEBE SELECCIONAR UN TERNERO",
        estado: false,
      });
      setCargando(false);
      return;
    }

    if (!fechaDiarrea) {
      setDiarreaTerneroAlert({
        status: true,
        message: "ERROR: DEBE INGRESAR LA FECHA",
        estado: false,
      });
      setCargando(false);
      return;
    }

    if (!severidad) {
      setDiarreaTerneroAlert({
        status: true,
        message: "ERROR: DEBE SELECCIONAR LA SEVERIDAD",
        estado: false,
      });
      setCargando(false);
      return;
    }

    const idEstablecimiento = establecimientoSeleccionado;

    if (!idEstablecimiento) {
      setDiarreaTerneroAlert({
        status: true,
        message: "ERROR: NO SE PUDO DETERMINAR EL ESTABLECIMIENTO",
        estado: false,
      });
      setCargando(false);
      return;
    }

    let newDiarreaTernero = {
      fecha_diarrea_ternero: fechaDiarrea,
      severidad: severidad,
      id_ternero: terneroId,
      observaciones: observaciones,
      // ✅ AGREGAR ESTO:
      id_establecimiento: parseInt(idEstablecimiento),
    };

    console.log("📤 Enviando diarrea:", newDiarreaTernero);
    console.log(
      "🏢 ID Establecimiento específico:",
      newDiarreaTernero.id_establecimiento
    );
    console.log("🏢 Tipo:", typeof newDiarreaTernero.id_establecimiento);
    console.log("🏢 Es NaN?:", isNaN(newDiarreaTernero.id_establecimiento));

    try {
      const resCrearDiarreaTernero = await crearDiarreTerneroHook(
        newDiarreaTernero
      );

      if (resCrearDiarreaTernero?.status === 201) {
        const proximoEpisodio = episodiosAnteriores + 1;
        setDiarreaTerneroAlert({
          status: true,
          message: `✅ EPISODIO #${proximoEpisodio} REGISTRADO CORRECTAMENTE`,
          estado: true,
        });
        limpiarFormulario();
      } else {
        setDiarreaTerneroAlert({
          status: true,
          message: "ERROR AL REGISTRAR: Verifique los datos",
          estado: false,
        });
      }
    } catch (error) {
      setDiarreaTerneroAlert({
        status: true,
        message: "ERROR DE CONEXIÓN: Intente nuevamente",
        estado: false,
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 p-3 sm:p-4'>
      <div className='bg-white p-4 sm:p-8 rounded-lg shadow-lg w-full max-w-2xl'>
        <div className='text-center mb-4 sm:mb-8'>
          <h2 className='text-xl sm:text-3xl font-bold text-gray-800 mb-2'>
            🥼 Registro de Diarrea en Ternero
          </h2>
          <p className='text-gray-600'>
            Complete los datos del episodio para seguimiento médico
          </p>
        </div>

        {/* SELECCIÓN DE TERNERO */}
        <div className='mb-6 bg-gray-50 p-4 rounded-lg'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            🐄 Seleccionar Ternero Afectado
          </label>
          {/* ✅ MEJORADO: Pasar establecimiento como prop */}

          <SeleccionarTernero
            terneroSeleccionado={handleTerneroId}
            idEstablecimiento={establecimientoSeleccionado}
          />
          {/* INFORMACIÓN DEL CONTADOR */}
          {terneroId > 0 && (
            <div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              {cargandoHistorial ? (
                <div className='flex items-center text-blue-600'>
                  <svg
                    className='animate-spin h-4 w-4 mr-2'
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
                  Consultando historial médico...
                </div>
              ) : (
                <div className='text-sm'>
                  <div className='flex items-center justify-between'>
                    <span className='text-blue-700 font-medium'>
                      📊 Historial Médico
                    </span>
                    <span className='text-blue-600 font-semibold'>
                      Ternero ID: {terneroId}
                    </span>
                  </div>
                  <div className='mt-2 flex items-center justify-between'>
                    <span className='text-gray-700'>
                      Episodios previos de diarrea:
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        episodiosAnteriores === 0
                          ? "text-green-600"
                          : episodiosAnteriores <= 2
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {episodiosAnteriores}
                    </span>
                  </div>
                  <div className='mt-1 text-xs text-gray-600'>
                    {episodiosAnteriores === 0 &&
                      "✅ Primer episodio - Sin historial previo"}
                    {episodiosAnteriores === 1 &&
                      "⚠️ Segundo episodio - Monitoreo recomendado"}
                    {episodiosAnteriores === 2 &&
                      "🔍 Tercer episodio - Evaluación veterinaria sugerida"}
                    {episodiosAnteriores >= 3 &&
                      "🚨 Episodios recurrentes - Atención especializada requerida"}
                  </div>
                  <div className='mt-2 p-2 bg-white rounded border border-blue-100'>
                    <span className='text-xs text-blue-700 font-medium'>
                      📝 Este será el episodio #{episodiosAnteriores + 1}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          {/* FECHA DEL EPISODIO */}
          <div>
            <label
              htmlFor='fecha_diarrea'
              className='block text-sm font-medium text-gray-700 mb-2'
            >
              📅 Fecha del Episodio
            </label>
            <input
              type='date'
              id='fecha_diarrea'
              value={fechaDiarrea}
              onChange={(e) => setFechaDiarrea(e.target.value)}
              className='w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              required
            />
          </div>

          {/* SEVERIDAD */}
          <div>
            <label
              htmlFor='severidad'
              className='block text-sm font-medium text-gray-700 mb-2'
            >
              ⚠️ Nivel de Severidad
            </label>
            <select
              id='severidad'
              value={severidad}
              onChange={(e) => setSeveridad(e.target.value)}
              className='w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              required
            >
              {opcionesSeveridad.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </div>

          {/* OBSERVACIONES MÉDICAS */}
          <div>
            <label
              htmlFor='observaciones'
              className='block text-sm font-medium text-gray-700 mb-2'
            >
              📝 Observaciones Médicas (Opcional)
            </label>
            <textarea
              id='observaciones'
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder='Ej: Ternero presenta deshidratación leve, se inició tratamiento con suero oral. Apetito reducido...'
              rows='4'
              className='w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none'
            />
            <p className='text-xs text-gray-500 mt-1'>
              Incluya detalles sobre síntomas, tratamientos aplicados, estado
              general del animal, etc.
            </p>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className='flex gap-4 pt-4'>
            <button
              type='button'
              onClick={limpiarFormulario}
              className='flex-1 py-3 px-4 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors'
            >
              🗑️ Limpiar
            </button>

            <button
              type='submit'
              disabled={cargando}
              className={`flex-2 py-3 px-6 font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 focus:outline-none focus:ring-2 ${
                cargando
                  ? "bg-gray-400 cursor-not-allowed text-gray-700"
                  : "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
              }`}
            >
              {cargando ? (
                <span className='flex items-center justify-center'>
                  <svg
                    className='animate-spin -ml-1 mr-3 h-5 w-5'
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
                `💾 Registrar Episodio`
              )}
            </button>
          </div>
        </form>

        {/* ALERTAS */}
        {diarreaTerneroAlert.status && (
          <div
            className={`mt-6 p-4 rounded-lg shadow-md text-center font-semibold ${
              diarreaTerneroAlert.estado
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {diarreaTerneroAlert.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormularioDiarreaTernero;
