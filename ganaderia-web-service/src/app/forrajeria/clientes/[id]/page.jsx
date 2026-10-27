"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { etiquetaEstado, plata } from "../../ventas";

const CAMPOS = [
  ["nombre", "Nombre", { required: true, maxLength: 150 }],
  ["documento", "CUIT / DNI", { maxLength: 30 }],
  ["telefono", "Teléfono", { maxLength: 50, type: "tel" }],
  ["whatsapp", "WhatsApp", { maxLength: 50, type: "tel" }],
  ["direccion", "Dirección", { maxLength: 200 }],
  ["zona", "Zona de reparto", { maxLength: 100 }],
];

const fecha = (valor) => new Date(valor).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const mensajeError = (error, porDefecto) => {
  const m = error.response?.data?.message;
  return Array.isArray(m) ? m.join(". ") : m || porDefecto;
};

export default function FichaCliente() {
  const { id } = useParams();
  const esDueno = useRolEnCampo() === "admin";
  const [cuenta, setCuenta] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [edicion, setEdicion] = useState(null);
  const [pago, setPago] = useState({ monto: "", concepto: "" });
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        businessApi.get(`/forrajeria/cuentas/clientes/${id}`),
        businessApi.get(`/forrajeria/pedidos?id_cliente=${id}`),
      ]);
      setCuenta(c.data);
      setPedidos(p.data || []);
    } catch (error) {
      setMensaje({ error: true, texto: mensajeError(error, "No se pudo cargar el cliente.") });
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarEdicion = async (event) => {
    event.preventDefault();
    const datos = { es_productor: edicion.es_productor, limite_credito: Number(edicion.limite_credito) || 0 };
    // Un campo vacío se manda como null para poder borrarlo (el nombre es obligatorio).
    for (const [campo] of CAMPOS) datos[campo] = edicion[campo]?.trim() || (campo === "nombre" ? undefined : null);
    try {
      await businessApi.patch(`/forrajeria/contactos/${id}`, datos);
      setEdicion(null);
      setMensaje({ texto: "Cliente actualizado." });
      await cargar();
    } catch (error) {
      setMensaje({ error: true, texto: mensajeError(error, "No se pudo actualizar el cliente.") });
    }
  };

  const cambiarEstado = async () => {
    const nuevo = cuenta.contacto.estado === "inactivo" ? "activo" : "inactivo";
    if (nuevo === "inactivo" && !window.confirm(`¿Dar de baja a "${cuenta.contacto.nombre}"? No se le van a poder cargar pedidos nuevos. Su cuenta y sus pedidos se conservan.`)) return;
    try {
      await businessApi.patch(`/forrajeria/contactos/${id}`, { estado: nuevo });
      setMensaje({ texto: nuevo === "inactivo" ? "Cliente dado de baja." : "Cliente reactivado." });
      await cargar();
    } catch (error) {
      setMensaje({ error: true, texto: mensajeError(error, "No se pudo cambiar el estado.") });
    }
  };

  const registrarPago = async (event) => {
    event.preventDefault();
    const monto = Number(pago.monto);
    if (!(monto > 0)) return setMensaje({ error: true, texto: "Indicá un monto mayor a cero." });
    if (!window.confirm(`¿Registrar un pago de ${plata(monto)} de ${cuenta.contacto.nombre}?`)) return;
    try {
      await businessApi.post(`/forrajeria/cuentas/clientes/${id}/pagos`, {
        monto,
        ...(pago.concepto.trim() ? { concepto: pago.concepto.trim() } : {}),
      });
      setPago({ monto: "", concepto: "" });
      setMensaje({ texto: `Pago de ${plata(monto)} registrado.` });
      await cargar();
    } catch (error) {
      setMensaje({ error: true, texto: mensajeError(error, "No se pudo registrar el pago.") });
    }
  };

  if (cargando) return <main className="min-h-screen bg-slate-950 p-8 text-slate-400">Cargando...</main>;
  if (!cuenta) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/forrajeria/clientes" className="text-sm text-emerald-400">← Volver a clientes</Link>
        <p className="mt-4 text-red-200">{mensaje?.texto || "Cliente no encontrado."}</p>
      </main>
    );
  }

  const { contacto: c, movimientos, saldo } = cuenta;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/forrajeria/clientes" className="text-sm text-emerald-400">← Volver a clientes</Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {c.nombre}
              {c.estado === "inactivo" && <span className="ml-3 rounded bg-slate-700 px-2 py-0.5 align-middle text-sm">de baja</span>}
            </h1>
            <p className="mt-1 text-slate-400">{[c.es_productor && "Productor", c.documento, c.zona].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${saldo > 0 ? "text-amber-400" : saldo < 0 ? "text-emerald-400" : ""}`}>{plata(Math.abs(saldo))}</p>
            <p className="text-sm text-slate-400">{saldo > 0 ? "Debe" : saldo < 0 ? "A favor" : "Al día"}</p>
          </div>
        </div>

        {mensaje && (
          <p className={`mt-4 rounded-lg p-3 text-sm ${mensaje.error ? "bg-red-950/60 text-red-200" : "bg-slate-900 text-emerald-300"}`}>{mensaje.texto}</p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          {/* Datos */}
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Datos</h2>
              {esDueno && !edicion && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEdicion({ ...Object.fromEntries(CAMPOS.map(([k]) => [k, c[k] || ""])), es_productor: c.es_productor, limite_credito: c.limite_credito ?? 0 })}
                    className="rounded bg-slate-700 px-2 py-1 text-xs"
                  >
                    Editar
                  </button>
                  <button onClick={cambiarEstado} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {c.estado === "inactivo" ? "Reactivar" : "Dar de baja"}
                  </button>
                </div>
              )}
            </div>
            {edicion ? (
              <form onSubmit={guardarEdicion} className="grid gap-3">
                {CAMPOS.map(([campo, etiqueta, props]) => (
                  <label key={campo} className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-300">{etiqueta}</span>
                    <input value={edicion[campo]} onChange={(e) => setEdicion({ ...edicion, [campo]: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" {...props} />
                  </label>
                ))}
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-300">Límite de crédito</span>
                  <input type="number" min="0" step="0.01" value={edicion.limite_credito} onChange={(e) => setEdicion({ ...edicion, limite_credito: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={edicion.es_productor} onChange={(e) => setEdicion({ ...edicion, es_productor: e.target.checked })} />
                  Es productor
                </label>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold">Guardar</button>
                  <button type="button" onClick={() => setEdicion(null)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm">Cancelar</button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {CAMPOS.slice(1).map(([campo, etiqueta]) => (
                  <div key={campo} className="contents">
                    <dt className="text-slate-400">{etiqueta}</dt>
                    <dd>{c[campo] || <span className="text-slate-600">-</span>}</dd>
                  </div>
                ))}
                <dt className="text-slate-400">Límite de crédito</dt>
                <dd>{Number(c.limite_credito) > 0 ? plata(c.limite_credito) : <span className="text-slate-600">Sin límite</span>}</dd>
              </dl>
            )}
          </section>

          {/* Cuenta corriente */}
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 text-lg font-semibold">Cuenta corriente</h2>
            {esDueno && (
              <form onSubmit={registrarPago} className="mb-4 flex flex-wrap gap-2">
                <input type="number" min="0.01" step="0.01" required placeholder="Monto" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} className="w-32 rounded-lg bg-slate-800 px-3 py-2 text-sm" />
                <input placeholder="Concepto (opcional)" maxLength={200} value={pago.concepto} onChange={(e) => setPago({ ...pago, concepto: e.target.value })} className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm" />
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Registrar pago</button>
              </form>
            )}
            {movimientos.length === 0 ? (
              <p className="text-sm text-slate-400">Sin movimientos. Los pedidos a crédito se cargan acá al entregarse.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr><th className="py-2 font-normal">Fecha</th><th className="py-2 font-normal">Concepto</th><th className="py-2 text-right font-normal">Debe</th><th className="py-2 text-right font-normal">Pagó</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {movimientos.map((m) => (
                    <tr key={m.id_movimiento}>
                      <td className="py-2 text-slate-400">{fecha(m.fecha_creacion)}</td>
                      <td className="py-2">{m.concepto}</td>
                      <td className="py-2 text-right">{Number(m.debe) > 0 ? plata(m.debe) : ""}</td>
                      <td className="py-2 text-right text-emerald-400">{Number(m.haber) > 0 ? plata(m.haber) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        {/* Pedidos */}
        <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pedidos</h2>
            {c.estado !== "inactivo" && (
              <Link href={`/forrajeria/pedidos/nuevo?cliente=${c.id_contacto}`} className="text-sm text-emerald-400 hover:text-emerald-300">Nuevo pedido →</Link>
            )}
          </div>
          {pedidos.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no tiene pedidos.</p>
          ) : (
            <ul className="divide-y divide-slate-800 text-sm">
              {pedidos.map((p) => (
                <li key={p.id_pedido} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Pedido #{p.id_pedido} <span className="text-slate-400">· {fecha(p.fecha_creacion)}</span>
                      <Link href={`/forrajeria/pedidos/${p.id_pedido}/remito`} className="ml-2 text-xs text-emerald-400 hover:text-emerald-300">remito</Link>
                    </p>
                    <p className="truncate text-slate-400">{p.items.map((i) => `${Number(i.cantidad)} ${i.producto?.nombre || "producto"}`).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{plata(p.total)}</p>
                    <p className="text-xs text-slate-400">{etiquetaEstado(p.estado)} · {p.forma_pago === "credito" ? "cuenta corriente" : "contado"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
