"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { coincideCliente, plata } from "../ventas";
import { deudaConProveedores, leDebemos } from "../compras";

const vacio = { nombre: "", documento: "", telefono: "", whatsapp: "", direccion: "" };

export default function Proveedores() {
  const esDueno = useRolEnCampo() === "admin";
  const [proveedores, setProveedores] = useState([]);
  const [saldos, setSaldos] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [verBajas, setVerBajas] = useState(false);
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        businessApi.get("/forrajeria/contactos?tipo=proveedor"),
        businessApi.get("/forrajeria/cuentas/saldos"),
      ]);
      setProveedores(p.data || []);
      setSaldos(Object.fromEntries((s.data || []).map((x) => [x.id_contacto, x])));
    } catch (error) {
      setMensaje({ error: true, texto: error.response?.data?.message || "No se pudieron cargar los proveedores." });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esDueno) cargar();
  }, [cargar, esDueno]);

  const guardar = async (event) => {
    event.preventDefault();
    const datos = { tipo: "proveedor", nombre: form.nombre.trim() };
    for (const campo of ["documento", "telefono", "whatsapp", "direccion"]) {
      if (form[campo].trim()) datos[campo] = form[campo].trim();
    }
    try {
      await businessApi.post("/forrajeria/contactos", datos);
      setMensaje({ texto: `Proveedor "${datos.nombre}" cargado.` });
      setForm(null);
      await cargar();
    } catch (error) {
      const m = error.response?.data?.message;
      setMensaje({ error: true, texto: Array.isArray(m) ? m.join(". ") : m || "No se pudo guardar el proveedor." });
    }
  };

  const visibles = useMemo(
    () => proveedores.filter((p) => (verBajas || p.estado !== "inactivo") && coincideCliente(p, busqueda)),
    [proveedores, verBajas, busqueda]
  );
  const bajas = proveedores.filter((p) => p.estado === "inactivo").length;
  const deuda = deudaConProveedores(proveedores, saldos);

  if (!esDueno) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/forrajeria" className="text-sm text-emerald-400">← Volver a forrajería</Link>
        <p className="mt-4 text-slate-400">Esta pantalla es solo para el dueño.</p>
      </main>
    );
  }

  const input = (campo, etiqueta, props = {}) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-300">{etiqueta}</span>
      <input value={form[campo]} onChange={(e) => setForm({ ...form, [campo]: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2 text-white" {...props} />
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/forrajeria/compras" className="text-sm text-emerald-400">← Volver a compras</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Proveedores</h1>
            <p className="mt-1 text-sm text-slate-400">
              Les debés en total <span className={deuda > 0 ? "font-semibold text-amber-300" : ""}>{cargando ? "-" : plata(deuda)}</span>
            </p>
          </div>
          {!form && (
            <button onClick={() => setForm(vacio)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Nuevo proveedor</button>
          )}
        </div>

        {mensaje && (
          <p className={`mt-4 rounded-lg p-3 text-sm ${mensaje.error ? "bg-red-950/60 text-red-200" : "bg-slate-900 text-emerald-300"}`}>{mensaje.texto}</p>
        )}

        {form && (
          <form onSubmit={guardar} className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
            {input("nombre", "Nombre *", { required: true, maxLength: 150 })}
            {input("documento", "CUIT", { maxLength: 30 })}
            {input("telefono", "Teléfono", { maxLength: 50, type: "tel" })}
            {input("whatsapp", "WhatsApp", { maxLength: 50, type: "tel" })}
            <div className="sm:col-span-2">{input("direccion", "Dirección", { maxLength: 200 })}</div>
            <div className="flex gap-2 sm:col-span-2">
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Guardar proveedor</button>
              <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm">Cancelar</button>
            </div>
          </form>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input type="search" placeholder="Buscar por nombre o CUIT" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm" />
          {bajas > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} />
              Mostrar dados de baja ({bajas})
            </label>
          )}
        </div>

        {!cargando && visibles.length === 0 ? (
          <p className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
            {proveedores.length === 0 ? "Todavía no hay proveedores. Cargá a quién le comprás la mercadería." : "Ningún proveedor coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
            {visibles.map((p) => {
              const debe = leDebemos(saldos[p.id_contacto]?.saldo);
              return (
                <li key={p.id_contacto}>
                  <Link href={`/forrajeria/proveedores/${p.id_contacto}`} className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-800/60 ${p.estado === "inactivo" ? "opacity-50" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.nombre}</p>
                      <p className="truncate text-sm text-slate-400">{[p.documento, p.telefono].filter(Boolean).join(" · ") || "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${debe > 0 ? "text-amber-300" : "text-slate-400"}`}>{debe > 0 ? plata(debe) : "Al día"}</p>
                      {debe > 0 && <p className="text-xs text-slate-500">le debés</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
