"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import businessApi from "@/api/bussines-api";
import { coincideCliente, haceCuanto, ordenarDeudores, plata } from "../ventas";

const vacio = { nombre: "", documento: "", telefono: "", whatsapp: "", direccion: "", zona: "", es_productor: false };

export default function ClientesForrajeria() {
  const { establecimientoActual } = useSelector((state) => state.auth);
  const [clientes, setClientes] = useState([]);
  const [saldos, setSaldos] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [verBajas, setVerBajas] = useState(false);
  const [soloDeudores, setSoloDeudores] = useState(false);
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [c, s] = await Promise.all([
        businessApi.get("/forrajeria/contactos?tipo=cliente"),
        businessApi.get("/forrajeria/cuentas/saldos"),
      ]);
      setClientes(c.data || []);
      setSaldos(Object.fromEntries((s.data || []).map((x) => [x.id_contacto, x])));
    } catch (error) {
      setMensaje({ error: true, texto: error.response?.data?.message || "No se pudieron cargar los clientes." });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar, establecimientoActual]);

  const guardar = async (event) => {
    event.preventDefault();
    const datos = { tipo: "cliente", nombre: form.nombre.trim(), es_productor: form.es_productor };
    for (const campo of ["documento", "telefono", "whatsapp", "direccion", "zona"]) {
      if (form[campo].trim()) datos[campo] = form[campo].trim();
    }
    try {
      await businessApi.post("/forrajeria/contactos", datos);
      setMensaje({ texto: `Cliente "${datos.nombre}" cargado.` });
      setForm(null);
      await cargar();
    } catch (error) {
      const m = error.response?.data?.message;
      setMensaje({ error: true, texto: Array.isArray(m) ? m.join(". ") : m || "No se pudo guardar el cliente." });
    }
  };

  const visibles = useMemo(() => {
    const filtrados = clientes.filter((c) => (verBajas || c.estado !== "inactivo") && coincideCliente(c, busqueda));
    return soloDeudores ? ordenarDeudores(filtrados, saldos) : filtrados;
  }, [clientes, verBajas, busqueda, soloDeudores, saldos]);
  const bajas = clientes.filter((c) => c.estado === "inactivo").length;
  const totalDeuda = Object.values(saldos).reduce((s, v) => s + (v.saldo > 0 ? v.saldo : 0), 0);

  const input = (campo, etiqueta, props = {}) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-300">{etiqueta}</span>
      <input
        value={form[campo]}
        onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
        className="rounded-lg bg-slate-800 px-3 py-2 text-white"
        {...props}
      />
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/forrajeria" className="text-sm text-emerald-400">← Volver a forrajería</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            {totalDeuda > 0 && <p className="mt-1 text-sm text-slate-400">Te deben en total {plata(totalDeuda)}</p>}
          </div>
          {!form && (
            <button onClick={() => setForm(vacio)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">
              Nuevo cliente
            </button>
          )}
        </div>

        {mensaje && (
          <p className={`mt-4 rounded-lg p-3 text-sm ${mensaje.error ? "bg-red-950/60 text-red-200" : "bg-slate-900 text-emerald-300"}`}>{mensaje.texto}</p>
        )}

        {form && (
          <form onSubmit={guardar} className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
            {input("nombre", "Nombre *", { required: true, maxLength: 150, autoFocus: true })}
            {input("documento", "CUIT / DNI", { maxLength: 30 })}
            {input("telefono", "Teléfono", { maxLength: 50, type: "tel" })}
            {input("whatsapp", "WhatsApp", { maxLength: 50, type: "tel" })}
            {input("direccion", "Dirección", { maxLength: 200 })}
            {input("zona", "Zona de reparto", { maxLength: 100 })}
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
              <input type="checkbox" checked={form.es_productor} onChange={(e) => setForm({ ...form, es_productor: e.target.checked })} />
              Es productor
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500">Guardar cliente</button>
              <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800">Cancelar</button>
            </div>
          </form>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <input
            type="search"
            placeholder="Buscar por nombre, CUIT o zona"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full max-w-sm rounded-lg bg-slate-800 px-3 py-2"
          />
          <div className="flex rounded-lg bg-slate-800 p-1 text-sm">
            {[[false, "Todos"], [true, "Deudores"]].map(([valor, texto]) => (
              <button key={texto} onClick={() => setSoloDeudores(valor)} className={`rounded-md px-3 py-1 ${soloDeudores === valor ? "bg-emerald-600 font-semibold" : "text-slate-300"}`}>
                {texto}
              </button>
            ))}
          </div>
          {bajas > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} />
              Mostrar dados de baja ({bajas})
            </label>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {cargando ? (
            <p className="p-5 text-slate-400">Cargando...</p>
          ) : visibles.length === 0 ? (
            <p className="p-5 text-slate-400">
              {clientes.length === 0
                ? "Todavía no cargaste clientes. Tocá \"Nuevo cliente\" para empezar."
                : soloDeudores
                  ? "Nadie te debe plata."
                  : "Ningún cliente coincide con la búsqueda."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {visibles.map((c) => {
                const saldo = saldos[c.id_contacto]?.saldo || 0;
                return (
                  <li key={c.id_contacto}>
                    <Link href={`/forrajeria/clientes/${c.id_contacto}`} className={`flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-800/60 ${c.estado === "inactivo" ? "opacity-50" : ""}`}>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {c.nombre}
                          {c.es_productor && <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">productor</span>}
                          {c.estado === "inactivo" && <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-xs">de baja</span>}
                        </p>
                        <p className="truncate text-sm text-slate-400">{[c.zona, c.telefono || c.whatsapp].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`font-semibold ${saldo > 0 ? "text-amber-400" : saldo < 0 ? "text-emerald-400" : "text-slate-400"}`}>{plata(Math.abs(saldo))}</p>
                        <p className="text-xs text-slate-500">
                          {saldo > 0 ? (soloDeudores ? `último pago: ${haceCuanto(saldos[c.id_contacto]?.ultimo_pago)}` : "debe") : saldo < 0 ? "a favor" : "al día"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
