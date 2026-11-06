"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import FormEvento from "./FormEvento";
import {
  CATEGORIAS,
  CONFIG_CAMPOS,
  ESTADOS,
  PENDIENTES,
  detalleVaca,
  fechaCorta,
  filtrarVacas,
  porcentaje,
  textoControl,
  textoTipo,
} from "./tambo";

const mensaje = (err, porDefecto) => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : m || porDefecto;
};

function Historial({ vaca, puedeBorrar, onCambio }) {
  const [eventos, setEventos] = useState(null);
  const [controles, setControles] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    const params = { id_madre: vaca.id_madre };
    Promise.all([businessApi.get("/tambo/eventos", { params }), businessApi.get("/tambo/controles", { params })])
      .then(([ev, ct]) => {
        setEventos(ev.data || []);
        setControles(ct.data || []);
      })
      .catch((err) => setError(mensaje(err, "No se pudo cargar el historial.")));
  }, [vaca.id_madre]);

  useEffect(cargar, [cargar]);

  const borrar = async (texto, url) => {
    if (!window.confirm(`¿Borrar ${texto}?`)) return;
    try {
      await businessApi.delete(url);
      cargar();
      onCambio();
    } catch (err) {
      setError(mensaje(err, "No se pudo borrar."));
    }
  };

  const botonBorrar = (texto, url) =>
    puedeBorrar && (
      <button onClick={() => borrar(texto, url)} className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800">
        Borrar
      </button>
    );

  if (error) return <p className="mt-3 text-sm text-red-600">{error}</p>;
  if (!eventos || !controles) return <p className="mt-3 text-sm text-gray-500">Cargando...</p>;
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-xs font-bold uppercase text-gray-500">Eventos reproductivos</h3>
        {eventos.length === 0 ? (
          <p className="text-sm text-gray-500">Sin eventos reproductivos cargados.</p>
        ) : (
          <ul data-historial="eventos" className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {eventos.map((ev) => (
              <li key={ev.id_evento} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="text-gray-700">
                  <span className="font-semibold">{fechaCorta(ev.fecha)}</span> · {textoTipo(ev.tipo)}
                  {ev.resultado && ` · ${ev.resultado}`}
                  {ev.dias_gestacion && ` (${ev.dias_gestacion} días)`}
                  {ev.toro && ` · ${ev.toro}`}
                  {ev.observacion && <span className="text-gray-500"> · {ev.observacion}</span>}
                </div>
                {botonBorrar(`${textoTipo(ev.tipo).toLowerCase()} del ${fechaCorta(ev.fecha)}`, `/tambo/eventos/${ev.id_evento}`)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-bold uppercase text-gray-500">Controles lecheros</h3>
        {controles.length === 0 ? (
          <p className="text-sm text-gray-500">Sin controles lecheros cargados.</p>
        ) : (
          <ul data-historial="controles" className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {controles.map((c) => (
              <li key={c.id_control} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700">
                <span>{textoControl(c)}</span>
                {botonBorrar(`el control del ${fechaCorta(c.fecha)}`, `/tambo/controles/${c.id_control}`)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Configuracion({ config, onGuardada }) {
  const [valores, setValores] = useState(config);
  const [estado, setEstado] = useState("");

  const guardar = async (e) => {
    e.preventDefault();
    setEstado("Guardando...");
    try {
      const cuerpo = Object.fromEntries(CONFIG_CAMPOS.map(({ clave }) => [clave, Number(valores[clave])]));
      await businessApi.patch("/tambo/configuracion", cuerpo);
      setEstado("Guardado.");
      onGuardada();
    } catch (err) {
      setEstado(mensaje(err, "No se pudo guardar."));
    }
  };

  return (
    <form onSubmit={guardar} className="mt-4 grid gap-3 sm:grid-cols-2">
      {CONFIG_CAMPOS.map(({ clave, texto }) => (
        <label key={clave} className="flex items-center justify-between gap-3 text-sm text-gray-700">
          {texto}
          <input
            type="number"
            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right"
            value={valores[clave] ?? ""}
            onChange={(e) => setValores((v) => ({ ...v, [clave]: e.target.value }))}
          />
        </label>
      ))}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Guardar</button>
        {estado && <span className="text-sm text-gray-600">{estado}</span>}
      </div>
    </form>
  );
}

export default function RodeoLechero() {
  const rol = useRolEnCampo();
  // El pedido lleva el campo elegido (lo agrega businessApi): se recarga cuando cambia.
  const establecimientoActual = useSelector((state) => state.auth.establecimientoActual);
  const puedeCargar = ["admin", "veterinario", "operario"].includes(rol);
  const puedeBorrar = ["admin", "veterinario"].includes(rol);
  const esDueno = rol === "admin";

  const [vacas, setVacas] = useState([]);
  const [pendientes, setPendientes] = useState(null);
  const [config, setConfig] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pendiente, setPendiente] = useState("");
  const [form, setForm] = useState(null); // null cerrado; {caravanas, tipo} abierto
  const [abierta, setAbierta] = useState(null);
  const [verConfig, setVerConfig] = useState(false);

  // Sin campo elegido el backend usa el principal; al elegirse uno se pide de nuevo
  // y se descarta la respuesta anterior si llega tarde.
  const pedido = useRef(0);
  const cargar = useCallback(async () => {
    const numero = ++pedido.current;
    setError("");
    try {
      const [rodeo, pend, res] = await Promise.all([
        businessApi.get("/tambo/rodeo"),
        businessApi.get("/tambo/pendientes"),
        businessApi.get("/tambo/resumen"),
      ]);
      if (numero !== pedido.current) return;
      setVacas(rodeo.data || []);
      setPendientes(pend.data.pendientes);
      setConfig(pend.data.config);
      setResumen(res.data);
    } catch (err) {
      if (numero !== pedido.current) return;
      setVacas([]);
      setPendientes(null);
      setResumen(null);
      setError(mensaje(err, "No se pudo cargar el rodeo."));
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establecimientoActual]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const diasPorVaca = useMemo(() => {
    if (!pendiente || !pendientes) return null;
    return new Map(pendientes[pendiente].map((i) => [i.id_madre, i.dias]));
  }, [pendiente, pendientes]);

  const lista = useMemo(
    () => filtrarVacas(vacas, { busqueda, categoria, soloIds: diasPorVaca ? [...diasPorVaca.keys()] : null }),
    [vacas, busqueda, categoria, diasPorVaca]
  );
  const infoPendiente = PENDIENTES.find((p) => p.clave === pendiente);

  const alGuardar = (cerrar) => {
    if (cerrar) setForm(null);
    cargar();
  };

  // Abre el formulario con todas las vacas del pendiente elegido (ej: día de tacto).
  const cargarParaPendiente = () => {
    const tipo = { reemparche: "parche", a_tactar: "tacto", sin_inseminar: "inseminacion", a_secar: "secado", a_preparto: "preparto", parto_proximo: "parto" }[pendiente];
    const caravanas = lista.map((v) => v.rp_madre).filter((rp) => rp != null).join(", ");
    setForm({ caravanas, tipo });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (cargando) return <div className="py-12 text-center text-gray-500">Cargando rodeo...</div>;

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">🐄 Rodeo lechero</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/tambo/control" className="rounded-lg border border-green-600 px-4 py-2 font-semibold text-green-700 hover:bg-green-50">
            🥛 Control lechero
          </Link>
          {puedeCargar && !form && (
            <button onClick={() => setForm({})} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
              + Cargar evento
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {form && (
        <FormEvento key={JSON.stringify(form)} vacas={vacas} inicial={form} onListo={alGuardar} onCerrar={() => setForm(null)} />
      )}

      {pendientes && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-md">
          <h2 className="mb-3 text-lg font-bold text-gray-800">Pendientes</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PENDIENTES.map(({ clave, texto }) => {
              const n = pendientes[clave].length;
              const activo = pendiente === clave;
              return (
                <button
                  key={clave}
                  disabled={n === 0}
                  onClick={() => setPendiente(activo ? "" : clave)}
                  className={`rounded-xl p-4 text-left transition ${
                    activo
                      ? "border-2 border-green-600 bg-green-50"
                      : n > 0
                        ? "border-2 border-slate-700 hover:bg-gray-50"
                        : "border-2 border-dashed border-gray-300 text-gray-400"
                  }`}
                >
                  <div className="text-3xl font-bold">{n}</div>
                  <div className="text-sm font-semibold">{texto}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {resumen && resumen.total > 0 && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-md">
          <h2 className="mb-3 text-lg font-bold text-gray-800">Resumen del rodeo</h2>
          <p className="mb-3 text-gray-700">
            <span className="text-2xl font-bold">{resumen.total}</span> cabezas
            {resumen.promedio_dias_en_leche != null && (
              <span className="text-sm text-gray-500">
                {" "}· {resumen.promedio_dias_en_leche} días en leche promedio ({resumen.vacas_con_parto} vacas en tambo con fecha de parto)
              </span>
            )}
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => (
              <span key={c} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {c}: {resumen.por_categoria[c] ?? 0}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ESTADOS)
              .filter(([clave]) => resumen.por_estado[clave] > 0)
              .map(([clave, { texto, clase }]) => (
                <span key={clave} className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${clase}`}>
                  {texto}: {resumen.por_estado[clave]} ({porcentaje(resumen.por_estado[clave], resumen.total)})
                </span>
              ))}
          </div>
          {resumen.por_estado.sin_dato > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              &quot;Sin dato&quot;: vacas sin eventos reproductivos. Cargá su último servicio o tacto para que entren en los pendientes.
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Animales</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">{lista.length}</span>
        </div>

        {infoPendiente && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            <span>
              Mostrando: <b>{infoPendiente.texto}</b>
            </span>
            <div className="flex gap-3">
              {puedeCargar && lista.length > 0 && (
                <button onClick={cargarParaPendiente} className="font-semibold underline">
                  Cargar evento para estas vacas
                </button>
              )}
              <button onClick={() => setPendiente("")} className="font-semibold underline">
                Ver todas
              </button>
            </div>
          </div>
        )}

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por caravana o nombre"
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:border-green-500 focus:outline-none"
        />
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {["", ...CATEGORIAS].map((c) => (
            <button
              key={c || "todas"}
              onClick={() => setCategoria(c)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                categoria === c ? "border-slate-800 bg-slate-800 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c || "Todas"}
            </button>
          ))}
        </div>

        {vacas.length === 0 && (
          <p className="py-6 text-center text-gray-500">Todavía no hay vacas cargadas. Cargalas desde Ingresos.</p>
        )}

        <ul className="divide-y divide-gray-100">
          {lista.map((v) => {
            const estado = ESTADOS[v.estado_reproductivo ?? "sin_dato"] ?? ESTADOS.sin_dato;
            const dias = diasPorVaca?.get(v.id_madre);
            return (
              <li key={v.id_madre} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-sm font-bold text-white">{v.rp_madre ?? "s/c"}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${estado.clase}`}>{estado.texto}</span>
                      {v.nombre && <span className="truncate text-sm text-gray-500">{v.nombre}</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{detalleVaca(v)}</p>
                    {v.ultimo_control && <p className="text-sm text-sky-700">{textoControl(v.ultimo_control)}</p>}
                    {dias != null && <p className="text-xs font-semibold text-green-700">{infoPendiente.detalle(dias)}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setAbierta(abierta === v.id_madre ? null : v.id_madre)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {abierta === v.id_madre ? "Cerrar" : "Historial"}
                    </button>
                    {puedeCargar && v.rp_madre != null && (
                      <button
                        onClick={() => {
                          setForm({ caravanas: String(v.rp_madre) });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Evento
                      </button>
                    )}
                  </div>
                </div>
                {abierta === v.id_madre && <Historial vaca={v} puedeBorrar={puedeBorrar} onCambio={cargar} />}
              </li>
            );
          })}
        </ul>
      </section>

      {esDueno && config && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-md">
          <button onClick={() => setVerConfig(!verConfig)} className="flex w-full items-center justify-between text-left">
            <h2 className="text-lg font-bold text-gray-800">Reglas de los pendientes</h2>
            <span className="text-sm text-gray-500">{verConfig ? "Ocultar" : "Cambiar"}</span>
          </button>
          {verConfig && <Configuracion config={config} onGuardada={cargar} />}
        </section>
      )}
    </div>
  );
}
