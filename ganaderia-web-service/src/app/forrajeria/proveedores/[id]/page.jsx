"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { plata } from "../../ventas";
import { leDebemos } from "../../compras";

const fecha = (valor) => new Date(valor).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const mensajeError = (error, porDefecto) => {
  const m = error.response?.data?.message;
  return Array.isArray(m) ? m.join(". ") : m || porDefecto;
};

export default function FichaProveedor() {
  const { id } = useParams();
  const esDueno = useRolEnCampo() === "admin";
  const [cuenta, setCuenta] = useState(null);
  const [compras, setCompras] = useState([]);
  const [pago, setPago] = useState({ monto: "", concepto: "" });
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        businessApi.get(`/forrajeria/cuentas/proveedores/${id}`),
        businessApi.get(`/forrajeria/compras?id_proveedor=${id}`),
      ]);
      setCuenta(c.data);
      setCompras(p.data || []);
    } catch (error) {
      setMensaje({ error: true, texto: mensajeError(error, "No se pudo cargar el proveedor.") });
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    if (esDueno) cargar();
  }, [cargar, esDueno]);

  const registrarPago = async (event) => {
    event.preventDefault();
    const monto = Number(pago.monto);
    if (!(monto > 0)) return setMensaje({ error: true, texto: "Indicá un monto mayor a cero." });
    if (!window.confirm(`¿Registrar un pago de ${plata(monto)} a ${cuenta.contacto.nombre}?`)) return;
    try {
      await businessApi.post(`/forrajeria/cuentas/proveedores/${id}/pagos`, {
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

  const cambiarEstado = async () => {
    const nuevo = cuenta.contacto.estado === "inactivo" ? "activo" : "inactivo";
    if (nuevo === "inactivo" && !window.confirm(`¿Dar de baja a "${cuenta.contacto.nombre}"? No se le van a poder cargar compras nuevas. Su cuenta y sus compras se conservan.`)) return;
    try {
      await businessApi.patch(`/forrajeria/contactos/${id}`, { estado: nuevo });
      setMensaje({ texto: nuevo === "inactivo" ? "Proveedor dado de baja." : "Proveedor reactivado." });
      await cargar();
    } catch (error) {
      setMensaje({ error: true, texto: mensajeError(error, "No se pudo cambiar el estado.") });
    }
  };

  if (!esDueno) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/forrajeria" className="text-sm text-emerald-400">← Volver a forrajería</Link>
        <p className="mt-4 text-slate-400">Esta pantalla es solo para el dueño.</p>
      </main>
    );
  }
  if (cargando) return <main className="min-h-screen bg-slate-950 p-8 text-slate-400">Cargando...</main>;
  if (!cuenta) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/forrajeria/proveedores" className="text-sm text-emerald-400">← Volver a proveedores</Link>
        <p className="mt-4 text-red-200">{mensaje?.texto || "Proveedor no encontrado."}</p>
      </main>
    );
  }

  const { contacto: p, movimientos, saldo } = cuenta;
  const debe = leDebemos(saldo);
  const aFavor = Number(saldo) > 0 ? Number(saldo) : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/forrajeria/proveedores" className="text-sm text-emerald-400">← Volver a proveedores</Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {p.nombre}
              {p.estado === "inactivo" && <span className="ml-3 rounded bg-slate-700 px-2 py-0.5 align-middle text-sm">de baja</span>}
            </h1>
            <p className="mt-1 text-slate-400">{[p.documento, p.telefono, p.direccion].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
            <button onClick={cambiarEstado} className="mt-2 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
              {p.estado === "inactivo" ? "Reactivar" : "Dar de baja"}
            </button>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${debe > 0 ? "text-amber-400" : aFavor > 0 ? "text-emerald-400" : ""}`}>{plata(debe || aFavor)}</p>
            <p className="text-sm text-slate-400">{debe > 0 ? "Le debés" : aFavor > 0 ? "A tu favor" : "Al día"}</p>
          </div>
        </div>

        {mensaje && (
          <p className={`mt-4 rounded-lg p-3 text-sm ${mensaje.error ? "bg-red-950/60 text-red-200" : "bg-slate-900 text-emerald-300"}`}>{mensaje.texto}</p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Compras</h2>
              {p.estado !== "inactivo" && (
                <Link href={`/forrajeria/compras/nueva?proveedor=${p.id_contacto}`} className="text-sm text-emerald-400 hover:text-emerald-300">Nueva compra →</Link>
              )}
            </div>
            {compras.length === 0 ? (
              <p className="text-sm text-slate-400">Todavía no hay compras a este proveedor.</p>
            ) : (
              <ul className="divide-y divide-slate-800 text-sm">
                {compras.map((c) => (
                  <li key={c.id_compra} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        Compra #{c.id_compra} <span className="text-slate-400">· {fecha(c.fecha_creacion)}{c.comprobante ? ` · ${c.comprobante}` : ""}</span>
                      </p>
                      <p className="truncate text-slate-400">{c.items.map((i) => `${Number(i.cantidad)} ${i.producto?.nombre || "producto"}`).join(", ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{plata(c.total)}</p>
                      <p className="text-xs text-slate-400">{c.forma_pago === "credito" ? "cuenta corriente" : "pagada"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 text-lg font-semibold">Cuenta corriente</h2>
            <form onSubmit={registrarPago} className="mb-4 flex flex-wrap gap-2">
              <input type="number" min="0.01" step="0.01" required placeholder="Monto" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} className="w-32 rounded-lg bg-slate-800 px-3 py-2 text-sm" />
              <input placeholder="Concepto (opcional)" maxLength={200} value={pago.concepto} onChange={(e) => setPago({ ...pago, concepto: e.target.value })} className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Registrar pago</button>
            </form>
            {movimientos.length === 0 ? (
              <p className="text-sm text-slate-400">Sin movimientos. Las compras a cuenta corriente se cargan acá.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr><th className="py-2 font-normal">Fecha</th><th className="py-2 font-normal">Concepto</th><th className="py-2 text-right font-normal">Compra</th><th className="py-2 text-right font-normal">Pagaste</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {movimientos.map((m) => (
                    <tr key={m.id_movimiento}>
                      <td className="py-2 text-slate-400">{fecha(m.fecha_creacion)}</td>
                      <td className="py-2">{m.concepto}</td>
                      <td className="py-2 text-right">{Number(m.haber) > 0 ? plata(m.haber) : ""}</td>
                      <td className="py-2 text-right text-emerald-400">{Number(m.debe) > 0 ? plata(m.debe) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
