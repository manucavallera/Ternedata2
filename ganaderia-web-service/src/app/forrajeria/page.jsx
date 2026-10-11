"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import businessApi from "@/api/bussines-api";

export default function ForrajeriaDashboard() {
  const { establecimientoActual } = useSelector((state) => state.auth);
  const [productos, setProductos] = useState([]);
  const [bajoStock, setBajoStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = useCallback(async () => {
    if (!establecimientoActual) return;
    setLoading(true);
    setError("");
    try {
      const [productosResponse, stockResponse] = await Promise.all([
        businessApi.get("/forrajeria/productos"),
        businessApi.get("/forrajeria/inventario/bajo-stock"),
      ]);
      setProductos(productosResponse.data || []);
      setBajoStock(stockResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar la forrajería.");
    } finally {
      setLoading(false);
    }
  }, [establecimientoActual]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (!establecimientoActual) {
    return <main className="min-h-screen bg-slate-950 p-6 text-white">Seleccioná una forrajería para comenzar.</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Módulo comercial</p>
            <h1 className="text-3xl font-bold">Forrajería</h1>
            <p className="mt-1 text-slate-400">Catálogo y control de stock</p>
          </div>
          <div className="flex gap-2">
            <Link href="/forrajeria/productos" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Gestionar productos</Link>
            <button onClick={cargarDatos} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Actualizar</button>
          </div>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-700 bg-red-950/50 p-4 text-red-200">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">Productos</p><p className="mt-2 text-3xl font-bold">{loading ? "—" : productos.length}</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">Bajo stock</p><p className="mt-2 text-3xl font-bold text-amber-400">{loading ? "—" : bajoStock.length}</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">Circuito activo</p><p className="mt-2 text-lg font-semibold text-emerald-400">Catálogo → stock</p></div>
        </div>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Productos cargados</h2><Link href="/forrajeria/productos" className="text-sm text-emerald-400 hover:text-emerald-300">Ver catálogo →</Link></div>
          {loading ? <p className="text-slate-400">Cargando...</p> : productos.length === 0 ? <p className="text-slate-400">Todavía no hay productos. Empezá cargando el catálogo.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Unidad</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Precio</th></tr></thead><tbody>{productos.slice(0, 8).map((producto) => <tr key={producto.id_producto} className="border-b border-slate-800"><td className="px-3 py-3 font-medium">{producto.nombre}</td><td className="px-3 py-3 text-slate-400">{producto.unidad_venta}</td><td className="px-3 py-3">{producto.stock_actual}</td><td className="px-3 py-3">${producto.precio}</td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </main>
  );
}
