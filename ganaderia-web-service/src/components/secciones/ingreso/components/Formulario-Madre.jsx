import { useBussinesMicroservicio } from "@/hooks/bussines";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";

const FormularioMadre = ({ setStep }) => {
  const { userPayload } = useSelector((state) => state.auth);
  const { crearMadreHook, obtenerEstablecimientosHook } =
    useBussinesMicroservicio();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      id_establecimiento: userPayload?.id_establecimiento || "",
    },
  });

  const [madreAlert, setMadreAlert] = useState({
    status: false,
    message: "",
    estado: true,
  });

  // ⬅️ NUEVO: Estado para establecimientos
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loadingEstablecimientos, setLoadingEstablecimientos] = useState(false);

  // ⬅️ NUEVO: Cargar establecimientos si es admin
  useEffect(() => {
    if (userPayload?.rol === "admin") {
      cargarEstablecimientos();
    } else if (userPayload?.id_establecimiento) {
      // Si no es admin, setear su establecimiento por defecto
      setValue("id_establecimiento", userPayload.id_establecimiento);
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

  const onSubmit = async (data) => {
    let newMadre = {
      nombre: data.nombre,
      rp_madre: parseInt(data.rp_madre),
      estado: data.estado,
      observaciones: data.observaciones,
      fecha_nacimiento: data.fecha_nacimiento,
      // ⬅️ NUEVO: Incluir establecimiento
      id_establecimiento:
        userPayload?.rol === "admin"
          ? parseInt(data.id_establecimiento)
          : userPayload?.id_establecimiento,
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
          // Si es admin, mantener el establecimiento seleccionado
          if (userPayload?.rol === "admin" && data.id_establecimiento) {
            setValue("id_establecimiento", data.id_establecimiento);
          }
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
            {/* ⬅️ NUEVO: Selector de Establecimiento (solo admin) */}
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
                  {...register("id_establecimiento", {
                    required: "Debe seleccionar un establecimiento",
                  })}
                  className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.id_establecimiento
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  disabled={loadingEstablecimientos}
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
                    {errors.id_establecimiento.message}
                  </span>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor='nombre'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Nombre de la Madre *
              </label>
              <input
                type='text'
                id='nombre'
                {...register("nombre", {
                  required: "Este campo es obligatorio",
                })}
                placeholder='Ej: Vaca María'
                className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.nombre ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.nombre && (
                <span className='text-red-500 text-sm'>
                  {errors.nombre.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor='rp_madre'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                RP Madre *
              </label>
              <input
                type='number'
                id='rp_madre'
                {...register("rp_madre", {
                  required: "Este campo es obligatorio",
                  min: { value: 1, message: "Debe ser mayor a 0" },
                })}
                placeholder='Número de registro'
                className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.rp_madre ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.rp_madre && (
                <span className='text-red-500 text-sm'>
                  {errors.rp_madre.message}
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
                htmlFor='fecha_nacimiento'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Fecha de Nacimiento *
              </label>
              <input
                type='date'
                id='fecha_nacimiento'
                {...register("fecha_nacimiento", {
                  required: "Este campo es obligatorio",
                })}
                max={new Date().toISOString().split("T")[0]}
                className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.fecha_nacimiento ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.fecha_nacimiento && (
                <span className='text-red-500 text-sm'>
                  {errors.fecha_nacimiento.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor='observaciones'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Observaciones *
              </label>
              <textarea
                id='observaciones'
                {...register("observaciones", {
                  required: "Este campo es obligatorio",
                })}
                placeholder='Observaciones sobre la madre (salud, comportamiento, etc.)'
                rows={2} className="text-sm"
                className={`w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.observaciones ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.observaciones && (
                <span className='text-red-500 text-sm'>
                  {errors.observaciones.message}
                </span>
              )}
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
