import { useBussinesMicroservicio } from "@/hooks/bussines";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";

const FormularioMadre = ({ setStep }) => {
  const { userPayload, establecimientoActual } = useSelector(
    (state) => state.auth
  );
  const { crearMadreHook, obtenerRodeosHook } = useBussinesMicroservicio();

  // El establecimiento sale del selector del navbar (admin) o del usuario (operario).
  const idEstablecimiento =
    establecimientoActual || userPayload?.id_establecimiento || null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [madreAlert, setMadreAlert] = useState({
    status: false,
    message: "",
    estado: true,
  });

  const [rodeos, setRodeos] = useState([]);
  const [loadingRodeos, setLoadingRodeos] = useState(false);

  useEffect(() => {
    if (!userPayload) return;
    cargarRodeos();
  }, [userPayload, idEstablecimiento]);

  const cargarRodeos = async () => {
    try {
      const tokenRaw = localStorage.getItem("token");
      if (!tokenRaw) return;
      setLoadingRodeos(true);
      const query = idEstablecimiento
        ? `id_establecimiento=${idEstablecimiento}&limit=500`
        : "limit=500";
      const response = await obtenerRodeosHook(query);
      if (response?.status === 200) {
        setRodeos(response.data.filter((r) => r.estado === "activo"));
      }
    } catch (error) {
      console.error("Error al cargar rodeos:", error);
    } finally {
      setLoadingRodeos(false);
    }
  };

  const onSubmit = async (data) => {
    if (!idEstablecimiento) {
      setMadreAlert({
        status: true,
        message: "❌ Elegí un establecimiento arriba antes de cargar la madre",
        estado: false,
      });
      return;
    }

    const rp = parseInt(data.rp_madre);

    let newMadre = {
      rp_madre: rp,
      // El nombre es opcional: si no lo ponen, la vaca se identifica por su RP.
      nombre: data.nombre?.trim() || `Vaca ${rp}`,
      estado: data.estado,
      ...(data.observaciones && { observaciones: data.observaciones }),
      ...(data.fecha_nacimiento && { fecha_nacimiento: data.fecha_nacimiento }),
      ...(data.id_rodeo && { id_rodeo: parseInt(data.id_rodeo) }),
      id_establecimiento: idEstablecimiento,
    };

    console.log("📤 Enviando madre:", newMadre);

    try {
      const resMadreCreada = await crearMadreHook(newMadre);

      console.log("📥 Respuesta:", resMadreCreada);

      if (resMadreCreada?.status === 201) {
        setMadreAlert({
          status: true,
          message: "✅ SE HA REGISTRADO LA MADRE CORRECTAMENTE",
          estado: true,
        });
        setTimeout(() => {
          reset();
        }, 2000);
      } else {
        const errorMsg =
          resMadreCreada?.data?.message || "ERROR AL REGISTRAR LA MADRE";
        setMadreAlert({
          status: true,
          message: `❌ ${errorMsg}`,
          estado: false,
        });
      }
    } catch (error) {
      console.error("🚨 Error:", error);

      const errorMsg =
        error?.response?.data?.message || error?.message || "ERROR DE CONEXIÓN";

      setMadreAlert({
        status: true,
        message: `❌ ${errorMsg}`,
        estado: false,
      });
    }

    // Ocultar alerta después de 5 segundos
    setTimeout(() => {
      setMadreAlert({ status: false, message: "", estado: true });
    }, 5000);
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 py-8'>
      <div className='bg-white p-8 rounded-lg shadow-lg w-full max-w-md'>
        <div>
          <h2 className='text-2xl font-bold text-center text-gray-900 mb-2'>
            Registro de Madre
          </h2>
          <p className='text-sm text-center text-gray-600 mb-6'>
            🐄 Complete los datos de la vaca madre
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <div>
              <label
                htmlFor='rp_madre'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                RP / Caravana *
              </label>
              <input
                type='number'
                id='rp_madre'
                inputMode='numeric'
                {...register("rp_madre", {
                  required: "Poné el número de caravana",
                  valueAsNumber: true,
                  validate: (v) =>
                    (Number.isInteger(v) && v > 0) || "Tiene que ser un número",
                })}
                placeholder='Ej: 717'
                className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.rp_madre ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.rp_madre && (
                <span className='text-red-500 text-sm'>
                  {errors.rp_madre.message}
                </span>
              )}
              <p className='text-xs text-gray-500 mt-1'>
                Este es el número con el que la vas a buscar y con el que la
                reconoce el bot.
              </p>
            </div>

            <div>
              <label
                htmlFor='nombre'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Nombre (opcional)
              </label>
              <input
                type='text'
                id='nombre'
                {...register("nombre")}
                placeholder='Ej: Vaca María'
                className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
              {errors.nombre && (
                <span className='text-red-500 text-sm'>
                  {errors.nombre.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor='estado'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Estado de la Madre *
              </label>
              <select
                id='estado'
                {...register("estado")}
                className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
              >
                <option value='Seca'>🌾 Seca</option>
                <option value='En Tambo'>🥛 En Tambo</option>
              </select>
            </div>

            <div>
              <label
                htmlFor='id_rodeo'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Rodeo
              </label>
              <select
                id='id_rodeo'
                {...register("id_rodeo")}
                className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
                disabled={loadingRodeos}
              >
                <option value=''>Sin rodeo asignado</option>
                {rodeos.map((r) => (
                  <option key={r.id_rodeo} value={r.id_rodeo}>
                    {r.nombre}{r.tipo ? ` (${r.tipo})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor='fecha_nacimiento'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Fecha de Nacimiento
              </label>
              <input
                type='date'
                id='fecha_nacimiento'
                {...register("fecha_nacimiento")}
                max={new Date().toISOString().split("T")[0]}
                className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
            </div>

            <div>
              <label
                htmlFor='observaciones'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Observaciones
              </label>
              <textarea
                id='observaciones'
                {...register("observaciones")}
                placeholder='Observaciones sobre la madre (salud, comportamiento, etc.)'
                rows={2}
                className='w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm'
              />
            </div>

            <div className='pt-4'>
              <button
                type='submit'
                className='w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all'
              >
                🐄 Guardar Madre
              </button>
            </div>
          </form>

          {madreAlert.status && (
            <div
              className={`mt-4 p-3 rounded-md text-center font-medium ${
                madreAlert.estado
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-red-100 text-red-800 border border-red-300"
              }`}
            >
              {madreAlert.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularioMadre;
