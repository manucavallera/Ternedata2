"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import businessApi from "@/api/bussines-api";
import { TIPOS_MOVIMIENTO } from "../stock";

const fecha = (valor) =>
  new Date(valor).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const num = (v) => Number(v).toLocaleString("es-AR", { maximumFractionDigits: 3 });

export default function HistorialStock() {
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [idProducto, setIdProducto] = useState("");
  const [tipo, setTipo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    businessApi
      .get("/forrajeria/productos")
      .then(({ data }) => setProductos(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCargando(true);
    businessApi
      .get(`/forrajeria/inventario/movimientos${idProducto ? `?id_producto=${idProducto}` : ""}`)
      .then(({ data }) => setMovimientos(data || []))
      .catch((err) => setError(err.response?.data?.message || "No se pudo cargar el historial."))
      .finally(() => setCargando(false));
  }, [idProducto]);

  const nombre = useMemo(() => new Map(productos.map((p) => [p.id_producto, p])), [productos]);
  const visibles = tipo ? movimientos.filter((m) => m.tipo === tipo) : movimientos;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/forrajeria/productos" className="text-sm text-emerald-400">← Volver a productos</Link>
        <h1 className="mt-4 text-3xl font-bold">Historial de stock</h1>
        <p className="mt-1 text-sm text-slate-400">Entradas, salidas, ajustes y lo que movieron los pedidos. Muestra los últimos 300.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <select value={idProducto} onChange={(e) => setIdProducto(e.target.value)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <option value="">Todos los productos</option>
            {productos.map((p) => (
              <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
            ))}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <option value="">Todos los movimientos</option>
            {Object.entries(TIPOS_MOVIMIENTO).map(([valor, { etiqueta }]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          {cargando ? (
            <p className="p-5 text-slate-400">Cargando...</p>
          ) : visibles.length === 0 ? (
            <p className="p-5 text-slate-400">No hay movimientos.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Movimiento</th>
                  <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visibles.map((m) => {
                  const t = TIPOS_MOVIMIENTO[m.tipo] || { etiqueta: m.tipo, color: "" };
                  const p = nombre.get(m.id_producto);
                  return (
                    <tr key={m.id_movimiento}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fecha(m.fecha_creacion)}</td>
                      <td className="px-4 py-3">{p?.nombre || `Producto #${m.id_producto}`}</td>
                      <td className={`px-4 py-3 font-medium ${t.color}`}>{t.etiqueta}</td>
                      <td className="px-4 py-3 text-right">
                        {m.tipo === "ajuste" ? "contado " : m.tipo === "salida" ? "-" : "+"}
                        {num(m.cantidad)} <span className="text-slate-500">{p?.unidad_venta}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-300">{num(m.stock_anterior)} → {num(m.stock_nuevo)}</td>
                      <td className="px-4 py-3 text-slate-400">{m.motivo || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
