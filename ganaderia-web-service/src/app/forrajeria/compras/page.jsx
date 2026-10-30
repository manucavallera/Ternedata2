"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { plata } from "../ventas";
import { deudaConProveedores } from "../compras";

const fecha = (valor) => new Date(valor).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default function Compras() {
  const esDueno = useRolEnCampo() === "admin";
  const [compras, setCompras] = useState([]);
  const [deuda, setDeuda] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!esDueno) return;
    Promise.all([
      businessApi.get("/forrajeria/compras"),
      businessApi.get("/forrajeria/contactos?tipo=proveedor"),
      businessApi.get("/forrajeria/cuentas/saldos"),
    ])
      .then(([c, p, s]) => {
        setCompras(c.data || []);
        const saldos = Object.fromEntries((s.data || []).map((x) => [x.id_contacto, x]));
        setDeuda(deudaConProveedores(p.data || [], saldos));
      })
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar las compras."))
      .finally(() => setCargando(false));
  }, [esDueno]);

  if (!esDueno) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/forrajeria" className="text-sm text-emerald-400">← Volver a forrajería</Link>
        <p className="mt-4 text-slate-400">Esta pantalla es solo para el dueño.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/forrajeria" className="text-sm text-emerald-400">← Volver a forrajería</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Compras</h1>
            <p className="mt-1 text-sm text-slate-400">
              Le debés a proveedores: <span className={deuda > 0 ? "font-semibold text-amber-300" : ""}>{cargando ? "-" : plata(deuda)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/forrajeria/compras/nueva" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Nueva compra</Link>
            <Link href="/forrajeria/proveedores" className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Proveedores</Link>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}

        {!cargando && compras.length === 0 ? (
          <p className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
            Todavía no hay compras. Cuando llega mercadería de un proveedor, registrala con &quot;Nueva compra&quot;: suma el stock y actualiza el costo.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {compras.map((c) => (
              <li key={c.id_compra}>
                <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400">Compra #{c.id_compra} · {fecha(c.fecha_creacion)}{c.comprobante ? ` · ${c.comprobante}` : ""}</p>
                      <Link href={`/forrajeria/proveedores/${c.id_proveedor}`} className="font-semibold hover:text-emerald-400">{c.proveedor?.nombre || `Proveedor #${c.id_proveedor}`}</Link>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{plata(c.total)}</p>
                      <p className={`text-xs ${c.forma_pago === "credito" ? "text-amber-300" : "text-slate-400"}`}>{c.forma_pago === "credito" ? "A cuenta corriente" : "Pagada"}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {c.items.map((i) => `${Number(i.cantidad)} ${i.producto?.unidad_venta || ""} ${i.producto?.nombre || "producto"} a ${plata(i.costo_unitario)}`.replace(/\s+/g, " ")).join(" · ")}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
