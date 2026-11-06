"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { armarPlanilla, fechaCorta, hoyISO, planillaACuerpo } from "../tambo";

const mensaje = (err, porDefecto) => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : m || porDefecto;
};

const litros = (n) => (n == null ? "-" : String(n).replace(".", ","));

export default function ControlLechero() {
  const rol = useRolEnCampo();
  const establecimientoActual = useSelector((state) => state.auth.establecimientoActual);
  const puedeCargar = ["admin", "veterinario", "operario"].includes(rol);

  const [fecha, setFecha] = useState(hoyISO());
  const [todas, setTodas] = useState(false);
  const [vacas, setVacas] = useState([]);
  const [controles, setControles] = useState([]);
  const [fechas, setFechas] = useState([]);
  const [filas, setFilas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Descarta respuestas viejas si se cambia de fecha o de campo antes de que lleguen.
  const pedido = useRef(0);
  const cargar = useCallback(async () => {
    const numero = ++pedido.current;
    setError("");
    try {
      const [rodeo, dia, lista] = await Promise.all([
        businessApi.get("/tambo/rodeo"),
        businessApi.get("/tambo/controles", { params: { fecha } }),
        businessApi.get("/tambo/controles"),
      ]);
      if (numero !== pedido.current) return;
      setVacas(rodeo.data || []);
      setControles(dia.data.controles || []);
      setFechas(lista.data || []);
    } catch (err) {
      if (numero !== pedido.current) return;
      setError(mensaje(err, "No se pudo cargar el control."));
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, establecimientoActual]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setFilas(armarPlanilla(vacas, controles, { todas }));
  }, [vacas, controles, todas]);

  const cambiar = (id, campo, valor) => {
    setAviso("");
    setFilas((fs) => fs.map((f) => (f.id_madre === id ? { ...f, [campo]: valor } : f)));
  };

  const { errores, vacas: cuerpo, resumen } = planillaACuerpo(filas);

  const guardar = async () => {
    if (errores.length) return;
    if (cuerpo.length === 0) {
      setAviso("No hay litros cargados.");
      return;
    }
    setGuardando(true);
    try {
      const res = await businessApi.post("/tambo/controles", { fecha, vacas: cuerpo });
      setControles(res.data.controles || []);
      setAviso(`Guardado: ${res.data.vacas} vacas, ${litros(res.data.litros)} L.`);
      const lista = await businessApi.get("/tambo/controles");
      setFechas(lista.data || []);
    } catch (err) {
      setAviso(mensaje(err, "No se pudo guardar."));
    } finally {
      setGuardando(false);
    }
  };

  const q = busqueda.trim().toLowerCase();
  const visibles = q
    ? filas.filter((f) => String(f.rp_madre ?? "").includes(q) || (f.nombre || "").toLowerCase().includes(q))
    : filas;

  if (cargando) return <div className="py-12 text-center text-gray-500">Cargando control...</div>;

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">🥛 Control lechero</h1>
        <Link href="/tambo" className="text-sm font-semibold text-green-700 underline">
          Volver al rodeo
        </Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-md">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold text-gray-700">
            Fecha del control
            <input
              type="date"
              value={fecha}
              max={hoyISO()}
              onChange={(e) => {
                setAviso("");
                if (e.target.value) setFecha(e.target.value);
              }}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} />
            Mostrar también secas, preparto y vaquillonas
          </label>
        </div>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por caravana o nombre"
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:border-green-500 focus:outline-none"
        />

        {filas.length === 0 ? (
          <p className="py-6 text-center text-gray-500">No hay vacas en tambo. Revisá la categoría de las vacas en el rodeo.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Caravana</th>
                <th className="py-2 text-right">Mañana (L)</th>
                <th className="py-2 text-right">Tarde (L)</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.id_madre} className="border-b border-gray-100" data-vaca={f.rp_madre ?? ""}>
                  <td className="py-1.5">
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 font-bold text-white">{f.rp_madre ?? "s/c"}</span>
                    {f.nombre && <span className="ml-2 text-gray-500">{f.nombre}</span>}
                  </td>
                  {["manana", "tarde"].map((campo) => (
                    <td key={campo} className="py-1.5 text-right">
                      <input
                        inputMode="decimal"
                        aria-label={`${campo === "manana" ? "Mañana" : "Tarde"} ${f.rp_madre ?? f.nombre}`}
                        disabled={!puedeCargar}
                        value={f[campo]}
                        onChange={(e) => cambiar(f.id_madre, campo, e.target.value)}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-gray-700">
          <b>{resumen.vacas}</b> vacas · <b>{litros(resumen.litros)}</b> L
          {resumen.promedio != null && <> · {litros(resumen.promedio)} L por vaca</>}
        </div>

        {errores.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-red-600">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        {puedeCargar && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={guardar}
              disabled={guardando || errores.length > 0}
              className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar control"}
            </button>
            {aviso && <span className="text-sm text-gray-600">{aviso}</span>}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
        <h2 className="mb-3 text-lg font-bold text-gray-800">Controles anteriores</h2>
        {fechas.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay controles cargados.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {fechas.map((f) => (
              <li key={f.fecha}>
                <button
                  onClick={() => {
                    setAviso("");
                    setFecha(f.fecha);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex w-full justify-between px-2 py-2 text-left text-sm hover:bg-gray-50 ${
                    f.fecha === fecha ? "font-bold text-green-700" : "text-gray-700"
                  }`}
                >
                  <span>{fechaCorta(f.fecha)}</span>
                  <span>
                    {f.vacas} vacas · {litros(f.litros)} L · {litros(f.promedio)} L/vaca
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
