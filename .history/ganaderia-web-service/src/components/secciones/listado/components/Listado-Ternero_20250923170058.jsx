import { useBussinesMicroservicio } from "@/hooks/bussines";
import React, { useEffect, useState } from "react";

const ListadoTernero = () => {
  // ✅ USAR HOOKS DISPONIBLES + NUEVOS
  const {
    obtenerTerneroHook,
    agregarPesoDiarioHook,
    obtenerHistorialCompletoHook,
    actualizarCalostradoHook,
  } = useBussinesMicroservicio();

  const [terneros, setTerneros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para el modal de peso diario mejorado
  const [modalPesoDiario, setModalPesoDiario] = useState({
    isOpen: false,
    ternero: null,
  });

  // Estado para el modal de historial
  const [modalHistorial, setModalHistorial] = useState({
    isOpen: false,
    ternero: null,
    data: null,
    loading: false,
  });

  // Estado para el modal de peso oficial (legacy)
  const [modalPesoOficial, setModalPesoOficial] = useState({
    isOpen: false,
    ternero: null,
  });

  const [modalEliminar, setModalEliminar] = useState({
    isOpen: false,
    ternero: null,
  });

  const [modalCalostrado, setModalCalostrado] = useState({
    isOpen: false,
    ternero: null,
  });

  // Estado para los datos del peso diario
  const [pesoDiarioData, setPesoDiarioData] = useState({
    peso_actual: "",
    fecha: "", // Opcional
  });

  // Estado para peso oficial (legacy)
  const [pesoOficialData, setPesoOficialData] = useState({
    peso: "",
    tipo_peso: "15d",
    observaciones: "",
  });

  // POR ESTO:
  const [calostradoData, setCalostradoData] = useState({
    metodo_calostrado: "",
    litros_calostrado: "",
    fecha_hora_calostrado: "",
    observaciones_calostrado: "",
    grado_brix: "", // ← NUEVA LÍNEA
  });

  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  // Función para mostrar alertas
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
  };

  const cargarTerneroLista = async () => {
    try {
      setLoading(true);
      const resTerneros = await obtenerTerneroHook();
      setTerneros(resTerneros?.data || []);
    } catch (error) {
      console.error("Error al cargar terneros:", error);
      setTerneros([]);
      showAlert("Error al cargar terneros", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTerneroLista();
  }, []);

  // 🆕 NUEVO: Abrir modal de peso diario mejorado
  const abrirModalPesoDiario = (ternero) => {
    setModalPesoDiario({
      isOpen: true,
      ternero: ternero,
    });
    setPesoDiarioData({
      peso_actual: "",
      fecha: "", // Usar fecha actual automáticamente
    });
  };

  // 🆕 NUEVO: Abrir modal de historial completo
  const abrirModalHistorial = async (ternero) => {
    setModalHistorial({
      isOpen: true,
      ternero: ternero,
      data: null,
      loading: true,
    });

    try {
      console.log("📤 Cargando historial para:", ternero.id_ternero);
      const resultado = await obtenerHistorialCompletoHook(ternero.id_ternero);

      if (resultado?.status === 200) {
        setModalHistorial((prev) => ({
          ...prev,
          data: resultado.data,
          loading: false,
        }));
      } else {
        showAlert("Error al cargar historial", "error");
        setModalHistorial((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("🚨 Error al cargar historial:", error);
      showAlert("Error de conexión al cargar historial", "error");
      setModalHistorial((prev) => ({ ...prev, loading: false }));
    }
  };

  // Función para abrir modal de peso oficial (legacy)
  const abrirModalPesoOficial = (ternero) => {
    setModalPesoOficial({
      isOpen: true,
      ternero: ternero,
    });
    setPesoOficialData({
      peso: "",
      tipo_peso: "15d",
      observaciones: "",
    });
  };

  // Función para abrir modal de eliminar
  const abrirModalEliminar = (ternero) => {
    setModalEliminar({
      isOpen: true,
      ternero: ternero,
    });
  };

  // Función para cerrar todos los modales
  const cerrarModales = () => {
    setModalPesoDiario({ isOpen: false, ternero: null });
    setModalHistorial({
      isOpen: false,
      ternero: null,
      data: null,
      loading: false,
    });
    setModalPesoOficial({ isOpen: false, ternero: null });
    setModalEliminar({ isOpen: false, ternero: null });
    setModalCalostrado({ isOpen: false, ternero: null }); // AGREGAR
    setPesoDiarioData({ peso_actual: "", fecha: "" });
    setPesoOficialData({ peso: "", tipo_peso: "15d", observaciones: "" });
    // POR ESTO:
    setCalostradoData({
      metodo_calostrado: "",
      litros_calostrado: "",
      fecha_hora_calostrado: "",
      observaciones_calostrado: "",
      grado_brix: "", // ← NUEVA LÍNEA
    });
  };
  // 🆕 NUEVO: Registrar peso diario usando el nuevo hook
  const registrarPesoDiario = async () => {
    if (!pesoDiarioData.peso_actual) {
      showAlert("Por favor ingresa el peso", "error");
      return;
    }

    try {
      const pesoData = {
        peso_actual: parseFloat(pesoDiarioData.peso_actual),
      };

      // Solo agregar fecha si se proporcionó
      if (pesoDiarioData.fecha && pesoDiarioData.fecha.trim() !== "") {
        pesoData.fecha = pesoDiarioData.fecha;
      }

      console.log("📤 Registrando peso diario:", {
        ternero_id: modalPesoDiario.ternero.id_ternero,
        pesoData,
      });

      const resultado = await agregarPesoDiarioHook(
        modalPesoDiario.ternero.id_ternero,
        pesoData
      );

      if (resultado?.status === 200 || resultado?.status === 201) {
        showAlert(`✅ Peso registrado: ${pesoDiarioData.peso_actual}kg`);
        cargarTerneroLista(); // Recargar lista
        cerrarModales();
      } else if (resultado?.status === 401) {
        showAlert("❌ Sesión expirada. Inicia sesión nuevamente.", "error");
      } else if (resultado?.status === 404) {
        showAlert("❌ Ternero no encontrado.", "error");
      } else {
        const errorMsg =
          resultado?.data?.message || resultado?.message || "Error desconocido";
        showAlert(`❌ Error: ${errorMsg}`, "error");
      }
    } catch (error) {
      console.error("🚨 Error al registrar peso:", error);
      showAlert("❌ Error de conexión", "error");
    }
  };

  // Función legacy para peso oficial (mantenida para compatibilidad)
  const obtenerToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token")
    );
  };

  const actualizarPesoOficial = async () => {
    if (!pesoOficialData.peso) {
      showAlert("Por favor ingresa el peso", "error");
      return;
    }

    const token = obtenerToken();
    if (!token) {
      showAlert("No hay sesión activa. Por favor, inicia sesión.", "error");
      return;
    }

    try {
      const updateData = {};

      switch (pesoOficialData.tipo_peso) {
        case "15d":
          updateData.peso_15d = parseFloat(pesoOficialData.peso);
          break;
        case "30d":
          updateData.peso_30d = parseFloat(pesoOficialData.peso);
          break;
        case "45d":
          updateData.peso_45d = parseFloat(pesoOficialData.peso);
          break;
        default:
          showAlert("Tipo de peso inválido", "error");
          return;
      }

      const response = await fetch(
        `http://localhost:3000/terneros/patch-ternero-by-id/${modalPesoOficial.ternero.id_ternero}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (response.ok) {
        showAlert(
          `Peso oficial de ${pesoOficialData.tipo_peso} actualizado correctamente`
        );
        cargarTerneroLista();
        cerrarModales();
      } else {
        showAlert(
          `Error al actualizar peso oficial (${response.status})`,
          "error"
        );
      }
    } catch (error) {
      console.error("🚨 Error al actualizar peso oficial:", error);
      showAlert("Error de conexión", "error");
    }
  };

  const eliminarTernero = async () => {
    const token = obtenerToken();
    if (!token) {
      showAlert("No hay sesión activa. Por favor, inicia sesión.", "error");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/terneros/delete-ternero-by-id/${modalEliminar.ternero.id_ternero}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        showAlert(
          `Ternero RP ${modalEliminar.ternero.rp_ternero} eliminado correctamente`
        );
        cargarTerneroLista();
      } else {
        showAlert(`Error al eliminar ternero (${response.status})`, "error");
      }
    } catch (error) {
      showAlert("Error de conexión al eliminar", "error");
    }

    cerrarModales();
  };

  const formatearHistorialPesajes = (estimativo) => {
    if (!estimativo || estimativo.trim() === "") return "Sin pesajes";
    const pesajes = estimativo.split("|");
    if (pesajes.length <= 2) return estimativo;
    const ultimos = pesajes.slice(-2);
    return `${ultimos.join(" | ")} (+${pesajes.length - 2} más)`;
  };

  const getRendimientoColor = (rendimiento) => {
    switch (rendimiento) {
      case "Excelente":
        return "bg-green-500 text-green-900";
      case "Bueno":
        return "bg-blue-500 text-blue-900";
      case "Regular":
        return "bg-yellow-500 text-yellow-900";
      case "Bajo":
        return "bg-red-500 text-red-900";
      default:
        return "bg-gray-500 text-gray-900";
    }
  };

  const evaluarCalidadCalostro = (gradoBrix) => {
    if (!gradoBrix)
      return { calidad: "Sin medición", color: "bg-gray-500 text-gray-900" };

    const brix = parseFloat(gradoBrix);

    if (brix >= 22) {
      return { calidad: "Excelente", color: "bg-green-500 text-green-900" };
    } else if (brix >= 18) {
      return { calidad: "Bueno", color: "bg-blue-500 text-blue-900" };
    } else if (brix >= 15) {
      return { calidad: "Regular", color: "bg-yellow-500 text-yellow-900" };
    } else {
      return { calidad: "Bajo", color: "bg-red-500 text-red-900" };
    }
  };

  const abrirModalCalostrado = (ternero) => {
    setModalCalostrado({
      isOpen: true,
      ternero: ternero,
    });
    setCalostradoData({
      metodo_calostrado: ternero.metodo_calostrado || "",
      litros_calostrado: ternero.litros_calostrado || "",
      fecha_hora_calostrado: ternero.fecha_hora_calostrado
        ? new Date(ternero.fecha_hora_calostrado).toISOString().slice(0, 16)
        : "",
      observaciones_calostrado: ternero.observaciones_calostrado || "",
      grado_brix: ternero.grado_brix || "", // ← NUEVA LÍNEA
    });
  };

  const actualizarCalostrado = async () => {
    if (
      !calostradoData.metodo_calostrado ||
      !calostradoData.litros_calostrado
    ) {
      showAlert("Por favor complete método y litros", "error");
      return;
    }

    try {
      const updateData = {
        metodo_calostrado: calostradoData.metodo_calostrado,
        litros_calostrado: parseFloat(calostradoData.litros_calostrado),
      };

      if (calostradoData.fecha_hora_calostrado) {
        updateData.fecha_hora_calostrado = calostradoData.fecha_hora_calostrado;
      }

      if (calostradoData.observaciones_calostrado?.trim()) {
        updateData.observaciones_calostrado =
          calostradoData.observaciones_calostrado.trim();
      }

      // ← NUEVA FUNCIONALIDAD: Grado Brix
      if (
        calostradoData.grado_brix &&
        calostradoData.grado_brix.trim() !== ""
      ) {
        updateData.grado_brix = parseFloat(calostradoData.grado_brix);
      }

      // ← NUEVA FUNCIONALIDAD: Grado Brix
      if (
        calostradoData.grado_brix &&
        calostradoData.grado_brix.trim() !== ""
      ) {
        updateData.grado_brix = parseFloat(calostradoData.grado_brix);
      }

      // USAR EL HOOK EN LUGAR DE FETCH DIRECTO
      const resultado = await actualizarCalostradoHook(
        modalCalostrado.ternero.id_ternero,
        updateData
      );

      if (resultado?.status === 200) {
        showAlert("Información de calostrado actualizada correctamente");
        cargarTerneroLista();
        cerrarModales();
      } else {
        showAlert(
          `Error al actualizar calostrado (${resultado?.status})`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error al actualizar calostrado:", error);
      showAlert("Error de conexión", "error");
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='relative flex flex-col w-full h-full overflow-scroll text-slate-300 bg-slate-800 shadow-lg rounded-xl p-6'>
        <h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent'>
          Listado de Terneros - Control de Crecimiento
        </h2>

        {/* Alert */}
        {alert.show && (
          <div
            className={`mb-4 p-4 rounded-lg text-center font-medium ${
              alert.type === "error"
                ? "bg-red-500 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {alert.type === "error" ? "❌" : "✅"} {alert.message}
          </div>
        )}

        {/* Contador de resultados */}
        <div className='mb-4 text-sm text-slate-400'>
          {loading
            ? "Cargando..."
            : `${terneros.length} ternero(s) encontrado(s)`}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-left table-auto min-w-max bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 border-separate border-spacing-0 rounded-lg shadow-2xl'>
            <thead className='bg-slate-900'>
              <tr>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  ID
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  RP
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Sexo
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  P. Nacer
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  P. Ideal
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Último Peso
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Días de Vida
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Pesos Oficiales
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Rendimiento
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Historial
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Acciones
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Madre
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Estado
                </th>
                <th className='px-3 py-2 border-b border-slate-600 bg-slate-700 text-xs'>
                  Calostrado
                </th>
              </tr>
            </thead>
            <tbody className='text-slate-300'>
              {loading ? (
                <tr>
                  <td colSpan='14' className='px-4 py-8 text-center'>
                    <div className='flex justify-center items-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500'></div>
                      <span className='ml-2'>Cargando terneros...</span>
                    </div>
                  </td>
                </tr>
              ) : terneros.length === 0 ? (
                <tr>
                  <td
                    colSpan='14'
                    className='px-4 py-8 text-center text-slate-400'
                  >
                    No se encontraron terneros
                  </td>
                </tr>
              ) : (
                terneros.map((ternero) => (
                  <tr
                    key={ternero.id_ternero}
                    className='hover:bg-slate-600 transition-all duration-300'
                  >
                    {/* ID */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <p className='text-xs font-semibold'>
                        {ternero.id_ternero}
                      </p>
                    </td>

                    {/* RP */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <p className='text-xs font-semibold'>
                        {ternero.rp_ternero}
                      </p>
                    </td>

                    {/* Sexo */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ternero.sexo === "Macho"
                            ? "bg-blue-500 text-blue-900"
                            : "bg-pink-500 text-pink-900"
                        }`}
                      >
                        {ternero.sexo}
                      </span>
                    </td>

                    {/* Peso al nacer */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <p className='text-xs font-bold text-green-400'>
                        {ternero.peso_nacer} kg
                      </p>
                    </td>

                    {/* Peso ideal */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <p className='text-xs font-bold text-yellow-400'>
                        {ternero.peso_ideal || ternero.peso_nacer * 2} kg
                      </p>
                    </td>

                    {/* Último peso registrado */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <div className='text-center'>
                        <p className='text-xs font-bold text-blue-400'>
                          {ternero.ultimo_peso || ternero.peso_nacer} kg
                        </p>
                        <p className='text-xs text-slate-500'>
                          {ternero.ultimo_pesaje_fecha || "Nacimiento"}
                        </p>
                      </div>
                    </td>

                    {/* Días de vida */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <div className='text-center'>
                        <span className='px-2 py-1 bg-orange-500 text-orange-900 rounded-full text-xs font-bold'>
                          {ternero.dias_desde_nacimiento || 0} días
                        </span>
                      </div>
                    </td>

                    {/* Pesos Oficiales */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <div className='space-y-1'>
                        <p className='text-xs'>
                          15d: <strong>{ternero.peso_15d || 0}kg</strong>
                        </p>
                        <p className='text-xs'>
                          30d: <strong>{ternero.peso_30d || 0}kg</strong>
                        </p>
                        <p className='text-xs'>
                          45d: <strong>{ternero.peso_45d || 0}kg</strong>
                        </p>
                      </div>
                    </td>

                    {/* Rendimiento */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <div className='space-y-1'>
                        <span
                          className={`px-1 py-0.5 rounded text-xs font-medium ${getRendimientoColor(
                            ternero.rendimiento_15d
                          )}`}
                        >
                          15d: {ternero.rendimiento_15d || "N/A"}
                        </span>
                        <span
                          className={`px-1 py-0.5 rounded text-xs font-medium ${getRendimientoColor(
                            ternero.rendimiento_30d
                          )}`}
                        >
                          30d: {ternero.rendimiento_30d || "N/A"}
                        </span>
                      </div>
                    </td>

                    {/* Historial de pesajes */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <button
                        onClick={() => abrirModalHistorial(ternero)}
                        className='text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer'
                        title='Click para ver historial completo'
                      >
                        {formatearHistorialPesajes(ternero.estimativo)}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <div className='space-y-1'>
                        <button
                          onClick={() => abrirModalPesoDiario(ternero)}
                          className='w-full px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors'
                          title='Usar nuevo sistema de peso diario'
                        >
                          ⚖️ Peso Diario
                        </button>
                        {ternero.metodo_calostrado && (
                          <button
                            onClick={() => abrirModalCalostrado(ternero)}
                            className='w-full px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors'
                            title='Editar información de calostrado'
                          >
                            🍼 Editar Calostrado
                          </button>
                        )}
                        <button
                          onClick={() => abrirModalPesoOficial(ternero)}
                          className='w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors'
                        >
                          📊 Peso Oficial
                        </button>
                        <button
                          onClick={() => abrirModalEliminar(ternero)}
                          className='w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors'
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>

                    {/* Madre */}
                    <td className='px-3 py-3 border-b border-slate-500'>
                      {ternero?.madre ? (
                        <div className='space-y-1'>
                          <p className='text-xs font-medium text-indigo-300'>
                            {ternero.madre.nombre}
                          </p>
                          <p className='text-xs'>
                            RP: {ternero.madre.rp_madre}
                          </p>
                        </div>
                      ) : (
                        <span className='text-xs text-slate-500 italic'>
                          Sin madre
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ternero.estado === "Vivo"
                            ? "bg-green-500 text-green-900"
                            : "bg-red-500 text-red-900"
                        }`}
                      >
                        {ternero.estado}
                      </span>
                    </td>

                    {/* Calostrado */}
                    <td className='px-3 py-3 border-b border-slate-700'>
                      {ternero.metodo_calostrado ? (
                        <div className='space-y-1'>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ternero.metodo_calostrado === "mamadera"
                                ? "bg-blue-500 text-blue-900"
                                : "bg-green-500 text-green-900"
                            }`}
                          >
                            {ternero.metodo_calostrado === "mamadera"
                              ? "🍼"
                              : "🩺"}{" "}
                            {ternero.metodo_calostrado}
                          </span>
                          <p className='text-xs text-slate-400'>
                            {ternero.litros_calostrado}L
                          </p>
                          {ternero.fecha_hora_calostrado && (
                            <p className='text-xs text-slate-500'>
                              {new Date(
                                ternero.fecha_hora_calostrado
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => abrirModalCalostrado(ternero)}
                          className='px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors'
                          title='Agregar información de calostrado'
                        >
                          + Calostrado
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Peso Diario Mejorado */}
        {modalPesoDiario.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white p-6 rounded-lg shadow-xl w-full max-w-md'>
              <div className='flex items-center gap-3 mb-4'>
                <span className='text-2xl'>⚖️</span>
                <h3 className='text-lg font-bold text-gray-800'>
                  Registrar Peso Diario
                </h3>
              </div>

              <div className='bg-gray-50 p-3 rounded-lg mb-4'>
                <p className='text-sm text-gray-600'>
                  <strong>Ternero:</strong> RP{" "}
                  {modalPesoDiario.ternero?.rp_ternero} (
                  {modalPesoDiario.ternero?.sexo})
                </p>
                <p className='text-sm text-gray-600'>
                  <strong>Días de vida:</strong>{" "}
                  {modalPesoDiario.ternero?.dias_desde_nacimiento || 0} días
                </p>
                <p className='text-sm text-gray-600'>
                  <strong>Último peso:</strong>{" "}
                  {modalPesoDiario.ternero?.ultimo_peso ||
                    modalPesoDiario.ternero?.peso_nacer}
                  kg
                </p>
              </div>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Peso Actual (kg) *
                  </label>
                  <input
                    type='number'
                    step='0.1'
                    value={pesoDiarioData.peso_actual}
                    onChange={(e) =>
                      setPesoDiarioData({
                        ...pesoDiarioData,
                        peso_actual: e.target.value,
                      })
                    }
                    className='w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900'
                    placeholder='Ej: 32.5'
                    min='0.1'
                    max='500'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Fecha del Pesaje (opcional)
                  </label>
                  <input
                    type='date'
                    value={pesoDiarioData.fecha}
                    onChange={(e) =>
                      setPesoDiarioData({
                        ...pesoDiarioData,
                        fecha: e.target.value,
                      })
                    }
                    max={new Date().toISOString().split("T")[0]}
                    className='w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900'
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    💡 Si no seleccionas fecha, se usará la fecha actual
                    automáticamente
                  </p>
                </div>

                <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
                  <h4 className='font-medium text-blue-900 mb-1'>
                    📊 Nueva Funcionalidad
                  </h4>
                  <p className='text-sm text-blue-700'>
                    Este peso se agregará al historial diario y se calculará
                    automáticamente el promedio de crecimiento.
                  </p>
                </div>
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  onClick={cerrarModales}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarPesoDiario}
                  disabled={!pesoDiarioData.peso_actual}
                  className='flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50'
                >
                  💾 Registrar Peso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Calostrado */}
        {modalCalostrado.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white p-6 rounded-lg shadow-xl w-full max-w-md'>
              <div className='flex items-center gap-3 mb-4'>
                <span className='text-2xl'>🍼</span>
                <h3 className='text-lg font-bold text-gray-800'>
                  {modalCalostrado.ternero?.metodo_calostrado
                    ? "Editar"
                    : "Agregar"}{" "}
                  Información de Calostrado
                </h3>
              </div>

              <div className='bg-gray-50 p-3 rounded-lg mb-4'>
                <p className='text-sm text-gray-600'>
                  <strong>Ternero:</strong> RP{" "}
                  {modalCalostrado.ternero?.rp_ternero} (
                  {modalCalostrado.ternero?.sexo})
                </p>
                <p className='text-sm text-gray-600'>
                  <strong>Días de vida:</strong>{" "}
                  {modalCalostrado.ternero?.dias_desde_nacimiento || 0} días
                </p>
              </div>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Método de Administración *
                  </label>
                  <select
                    value={calostradoData.metodo_calostrado}
                    onChange={(e) =>
                      setCalostradoData({
                        ...calostradoData,
                        metodo_calostrado: e.target.value,
                      })
                    }
                    className='w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900'
                  >
                    <option value=''>Seleccionar método...</option>
                    <option value='mamadera'>🍼 Mamadera</option>
                    <option value='sonda'>🩺 Sonda</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Litros Administrados *
                  </label>
                  <input
                    type='number'
                    step='0.1'
                    value={calostradoData.litros_calostrado}
                    onChange={(e) =>
                      setCalostradoData({
                        ...calostradoData,
                        litros_calostrado: e.target.value,
                      })
                    }
                    className='w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900'
                    placeholder='Ej: 2.5'
                    min='0.1'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Fecha y Hora de Administración
                  </label>
                  <input
                    type='datetime-local'
                    value={calostradoData.fecha_hora_calostrado}
                    onChange={(e) =>
                      setCalostradoData({
                        ...calostradoData,
                        fecha_hora_calostrado: e.target.value,
                      })
                    }
                    className='w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Observaciones
                  </label>
                  <textarea
                    value={calostradoData.observaciones_calostrado}
                    onChange={(e) =>
                      setCalostradoData({
                        ...calostradoData,
                        observaciones_calostrado: e.target.value,
                      })
                    }
                    rows={2}
                    className='w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900'
                    placeholder='Ej: Se administró sin problemas, el ternero lo aceptó bien'
                  />
                </div>
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  onClick={cerrarModales}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={actualizarCalostrado}
                  disabled={
                    !calostradoData.metodo_calostrado ||
                    !calostradoData.litros_calostrado
                  }
                  className='flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50'
                >
                  💾{" "}
                  {modalCalostrado.ternero?.metodo_calostrado
                    ? "Actualizar"
                    : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Historial Completo */}
        {modalHistorial.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-3'>
                  <span className='text-2xl'>📊</span>
                  <h3 className='text-xl font-bold text-gray-800'>
                    Historial de Pesos - RP {modalHistorial.ternero?.rp_ternero}
                  </h3>
                </div>
                <button
                  onClick={cerrarModales}
                  className='text-gray-500 hover:text-gray-700 text-xl font-bold'
                >
                  ✕
                </button>
              </div>

              {modalHistorial.loading ? (
                <div className='flex justify-center items-center py-12'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                  <span className='ml-3'>Cargando historial...</span>
                </div>
              ) : modalHistorial.data ? (
                <div className='space-y-6'>
                  {/* Estadísticas principales */}
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
                      <h4 className='font-medium text-green-900 mb-1'>
                        Peso al Nacer
                      </h4>
                      <p className='text-2xl font-bold text-green-600'>
                        {modalHistorial.data.peso_nacer}kg
                      </p>
                    </div>

                    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                      <h4 className='font-medium text-blue-900 mb-1'>
                        Peso Actual
                      </h4>
                      <p className='text-2xl font-bold text-blue-600'>
                        {modalHistorial.data.ultimo_peso}kg
                      </p>
                      <p className='text-xs text-blue-700'>
                        {modalHistorial.data.ultimo_pesaje_fecha}
                      </p>
                    </div>

                    <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                      <h4 className='font-medium text-yellow-900 mb-1'>
                        Ganancia Total
                      </h4>
                      <p className='text-2xl font-bold text-yellow-600'>
                        +{modalHistorial.data.ganancia_total}kg
                      </p>
                    </div>

                    <div className='bg-purple-50 border border-purple-200 rounded-lg p-4'>
                      <h4 className='font-medium text-purple-900 mb-1'>
                        Promedio Diario
                      </h4>
                      <p className='text-2xl font-bold text-purple-600'>
                        {modalHistorial.data.aumento_diario_promedio}kg/día
                      </p>
                      <p className='text-xs text-purple-700'>
                        {modalHistorial.data.dias_desde_nacimiento} días
                      </p>
                    </div>
                  </div>

                  {/* Historial de pesajes */}
                  <div>
                    <h4 className='text-lg font-bold text-gray-800 mb-4'>
                      📈 Historial de Pesajes (
                      {modalHistorial.data.historial_pesos?.length || 0}{" "}
                      registros)
                    </h4>

                    {modalHistorial.data.historial_pesos?.length > 0 ? (
                      <div className='overflow-x-auto'>
                        <table className='w-full border-collapse border border-gray-300'>
                          <thead>
                            <tr className='bg-gray-50'>
                              <th className='border border-gray-300 px-4 py-2 text-left'>
                                #
                              </th>
                              <th className='border border-gray-300 px-4 py-2 text-left'>
                                Fecha
                              </th>
                              <th className='border border-gray-300 px-4 py-2 text-left'>
                                Peso (kg)
                              </th>
                              <th className='border border-gray-300 px-4 py-2 text-left'>
                                Ganancia
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Registro de nacimiento */}
                            <tr className='bg-green-50'>
                              <td className='border border-gray-300 px-4 py-2'>
                                🍼
                              </td>
                              <td className='border border-gray-300 px-4 py-2'>
                                Nacimiento
                              </td>
                              <td className='border border-gray-300 px-4 py-2 font-bold'>
                                {modalHistorial.data.peso_nacer}kg
                              </td>
                              <td className='border border-gray-300 px-4 py-2'>
                                -
                              </td>
                            </tr>

                            {/* Registros de pesajes */}
                            {modalHistorial.data.historial_pesos.map(
                              (pesaje, index) => {
                                const pesoAnterior =
                                  index === 0
                                    ? modalHistorial.data.peso_nacer
                                    : modalHistorial.data.historial_pesos[
                                        index - 1
                                      ].peso;
                                const ganancia = (
                                  pesaje.peso - pesoAnterior
                                ).toFixed(1);

                                return (
                                  <tr
                                    key={index}
                                    className={
                                      index % 2 === 0
                                        ? "bg-gray-50"
                                        : "bg-white"
                                    }
                                  >
                                    <td className='border border-gray-300 px-4 py-2'>
                                      {index + 1}
                                    </td>
                                    <td className='border border-gray-300 px-4 py-2'>
                                      {pesaje.fecha}
                                    </td>
                                    <td className='border border-gray-300 px-4 py-2 font-bold'>
                                      {pesaje.peso}kg
                                    </td>
                                    <td
                                      className={`border border-gray-300 px-4 py-2 ${
                                        ganancia > 0
                                          ? "text-green-600"
                                          : ganancia < 0
                                          ? "text-red-600"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {ganancia > 0 ? "+" : ""}
                                      {ganancia}kg
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className='text-center py-8 text-gray-500'>
                        📝 No hay pesajes registrados aún. Usa el botón "Peso
                        Diario" para agregar el primer pesaje.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className='text-center py-12 text-red-500'>
                  ❌ Error al cargar el historial
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Peso Oficial (Legacy) */}
        {modalPesoOficial.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white p-6 rounded-lg shadow-xl w-full max-w-md'>
              <h3 className='text-lg font-bold text-gray-800 mb-4'>
                Actualizar Peso Oficial
              </h3>

              <div className='mb-4'>
                <p className='text-sm text-gray-600 mb-2'>
                  <strong>Ternero:</strong> RP{" "}
                  {modalPesoOficial.ternero?.rp_ternero} -{" "}
                  {modalPesoOficial.ternero?.dias_desde_nacimiento} días
                </p>
              </div>

              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Tipo de Peso
                </label>
                <select
                  value={pesoOficialData.tipo_peso}
                  onChange={(e) =>
                    setPesoOficialData({
                      ...pesoOficialData,
                      tipo_peso: e.target.value,
                    })
                  }
                  className='w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900'
                >
                  <option value='15d'>Peso a los 15 días</option>
                  <option value='30d'>Peso a los 30 días</option>
                  <option value='45d'>Peso a los 45 días</option>
                </select>
              </div>

              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Peso (kg)
                </label>
                <input
                  type='number'
                  step='0.1'
                  value={pesoOficialData.peso}
                  onChange={(e) =>
                    setPesoOficialData({
                      ...pesoOficialData,
                      peso: e.target.value,
                    })
                  }
                  className='w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900'
                  placeholder='Ej: 45.5'
                />
              </div>

              <div className='flex gap-3'>
                <button
                  onClick={actualizarPesoOficial}
                  className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors'
                >
                  Actualizar Peso
                </button>
                <button
                  onClick={cerrarModales}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors'
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Eliminación */}
        {modalEliminar.isOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white p-6 rounded-lg shadow-xl w-full max-w-md'>
              <div className='flex items-center gap-3 mb-4'>
                <span className='text-red-600 text-2xl'>⚠️</span>
                <h3 className='text-lg font-bold text-gray-800'>
                  Confirmar Eliminación
                </h3>
              </div>

              <p className='text-gray-600 mb-4'>
                ¿Eliminar el ternero{" "}
                <strong>RP {modalEliminar.ternero?.rp_ternero}</strong>?
              </p>
              <p className='text-red-600 text-sm mb-6'>
                Esta acción no se puede deshacer.
              </p>

              <div className='flex gap-3'>
                <button
                  onClick={cerrarModales}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarTernero}
                  className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors'
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leyenda actualizada */}
        <div className='mt-4 p-4 bg-slate-700 rounded-lg'>
          <h3 className='text-sm font-bold text-slate-300 mb-2'>Leyenda:</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-xs'>
            <div>
              <p className='mb-1'>
                <strong>⚖️ Peso Diario:</strong> Nuevo sistema mejorado con
                fecha automática
              </p>
              <p className='mb-1'>
                <strong>🍼 Calostrado:</strong> Agregar/editar información de
                calostrado
              </p>
              <p className='mb-1'>
                <strong>📊 Peso Oficial:</strong> Actualiza pesos oficiales de
                15, 30 o 45 días
              </p>
              <p>
                <strong>📈 Historial:</strong> Click para ver estadísticas
                completas
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <span className='px-2 py-1 bg-green-500 text-green-900 rounded'>
                Excelente (110%+)
              </span>
              <span className='px-2 py-1 bg-blue-500 text-blue-900 rounded'>
                Bueno (95-109%)
              </span>
              <span className='px-2 py-1 bg-yellow-500 text-yellow-900 rounded'>
                Regular (80-94%)
              </span>
              <span className='px-2 py-1 bg-red-500 text-red-900 rounded'>
                Bajo (79%-)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListadoTernero;
