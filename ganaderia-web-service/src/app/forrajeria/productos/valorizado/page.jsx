"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { plata } from "../../ventas";
import { valorizar } from "../stock";

const ORDEN = {
  valor: ["Más plata en el galpón", (a, b) => b.valorPrecio - a.valorPrecio],
  margen: ["Mayor margen %", (a, b) => (b.margenPct ?? -1) - (a.margenPct ?? -1)],
  nombre: ["Nombre", (a, b) => a.nombre.localeCompare(b.nombre)],
};

export default function StockValorizado() {
  const esDueno = useRolEnCampo() === "admin";
  const [productos, setProductos] = useState([]);
  const [orden, setOrden] = useState("valor");
  const [verSinStock, setVerSinStock] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    businessApi
      .get("/forrajeria/productos")
      .then(({ data }) => setProductos(data || []))
      .catch((err) => setError(err.response?.data?.message || "No se pudo cargar el stock."))
      .finally(() => setCargando(false));
  }, []);

  const resumen = useMemo(() => valorizar(productos), [productos]);
  const filas = useMemo(
    () => resumen.filas.filter((f) => verSinStock || f.stock > 0).sort(ORDEN[orden][1]),
    [resumen, orden, verSinStock]
  );
  const sinStock = resumen.filas.filter((f) => f.stock <= 0).length;

  if (!esDueno) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/forrajeria/productos" className="text-sm text-emerald-400">← Volver a productos</Link>
        <p className="mt-4 text-slate-400">Esta pantalla es solo para el dueño.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/forrajeria/productos" className="text-sm text-emerald-400">← Volver a productos</Link>
        <h1 className="mt-4 text-3xl font-bold">Stock y ganancia</h1>
        <p className="mt-1 text-sm text-slate-400">Con el costo y el precio que tiene cargado cada producto hoy.</p>

        {error && <p className="mt-4 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Stock a costo</p>
            <p className="mt-2 text-3xl font-bold">{cargando ? "-" : plata(resumen.valorCosto)}</p>
            <p className="mt-1 text-xs text-slate-500">Lo que pagaste por lo que hay</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Stock a precio de venta</p>
            <p className="mt-2 text-3xl font-bold">{cargando ? "-" : plata(resumen.valorPrecio)}</p>
            <p className="mt-1 text-xs text-slate-500">Lo que cobrarías si vendés todo</p>
          </div>
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-5">
            <p className="text-sm text-emerald-300">Ganancia si vendés todo</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">{cargando ? "-" : plata(resumen.gananciaPotencial)}</p>
            <p className="mt-1 text-xs text-slate-500">Solo productos con costo cargado</p>
          </div>
        </div>

        {resumen.sinCosto > 0 && (
          <p className="mt-4 rounded-lg bg-amber-950/40 p-3 text-sm text-amber-300">
            {resumen.sinCosto} {resumen.sinCosto === 1 ? "producto con stock no tiene" : "productos con stock no tienen"} costo cargado y no
            suman a la ganancia. Cargalo con &quot;Editar&quot; en <Link href="/forrajeria/productos" className="underline">Productos</Link>.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-400">Ordenar por:</span>
          {Object.entries(ORDEN).map(([clave, [texto]]) => (
            <button key={clave} onClick={() => setOrden(clave)} className={`rounded-full px-3 py-1 ${orden === clave ? "bg-emerald-600 font-semibold" : "bg-slate-800 text-slate-300"}`}>
              {texto}
            </button>
          ))}
          {sinStock > 0 && (
            <label className="ml-auto flex items-center gap-2 text-slate-400">
              <input type="checkbox" checked={verSinStock} onChange={(e) => setVerSinStock(e.target.checked)} />
              Mostrar sin stock ({sinStock})
            </label>
          )}
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Costo</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 text-right font-medium">Margen</th>
                <th className="px-4 py-3 text-right font-medium">Valor a costo</th>
                <th className="px-4 py-3 text-right font-medium">Valor a precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {!cargando && filas.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-5 text-slate-400">No hay productos con stock. Cargá la mercadería que entra en Productos.</td></tr>
              )}
              {filas.map((f) => (
                <tr key={f.id_producto}>
                  <td className="px-4 py-3 font-medium">{f.nombre}</td>
                  <td className="px-4 py-3 text-right">{f.stock} <span className="text-slate-500">{f.unidad_venta}</span></td>
                  <td className="px-4 py-3 text-right">{f.sinCosto ? <span className="text-amber-400">sin costo</span> : plata(f.costo)}</td>
                  <td className="px-4 py-3 text-right">{f.precio ? plata(f.precio) : <span className="text-amber-400">sin precio</span>}</td>
                  <td className={`px-4 py-3 text-right ${f.margen < 0 ? "text-red-400" : ""}`}>
                    {f.margenPct === null ? "-" : `${plata(f.margen)} (${f.margenPct}%)`}
                  </td>
                  <td className="px-4 py-3 text-right">{f.sinCosto ? "-" : plata(f.valorCosto)}</td>
                  <td className="px-4 py-3 text-right">{plata(f.valorPrecio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
