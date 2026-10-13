"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import businessApi from "@/api/bussines-api";
import { crearMovimientoStock } from "./movimiento";

const unidades = ["kg", "bolsa", "fardo", "rollo", "tonelada", "unidad"];

export default function ProductosForrajeria() {
  const router = useRouter();
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({ nombre: "", unidad_venta: "kg", precio: "", costo: "", stock_minimo: "" });
  const [mensaje, setMensaje] = useState("");
  const [movimiento, setMovimiento] = useState({});

  const cargar = async () => {
    const response = await businessApi.get("/forrajeria/productos");
    setProductos(response.data || []);
  };

  useEffect(() => { cargar().catch(() => setMensaje("No se pudo cargar el catálogo.")); }, []);

  const guardar = async (event) => {
    event.preventDefault();
    try {
      await businessApi.post("/forrajeria/productos", {
        ...form,
        precio: Number(form.precio),
        costo: form.costo === "" ? undefined : Number(form.costo),
        stock_minimo: form.stock_minimo === "" ? undefined : Number(form.stock_minimo),
      });
      setForm({ nombre: "", unidad_venta: "kg", precio: "", costo: "", stock_minimo: "" });
      setMensaje("Producto guardado.");
      await cargar();
    } catch (error) {
      setMensaje(error.response?.data?.message || "No se pudo guardar el producto.");
    }
  };

  const registrarMovimiento = async (producto) => {
    const datos = movimiento[producto.id_producto];
    if (!datos?.cantidad || Number(datos.cantidad) <= 0) {
      setMensaje("Indicá una cantidad mayor a cero.");
      return;
    }
    try {
      await businessApi.post(
        `/forrajeria/inventario/productos/${producto.id_producto}/movimientos`,
        crearMovimientoStock(datos.tipo || "entrada", datos.cantidad, datos.motivo)
      );
      setMensaje(`Stock actualizado: ${producto.nombre}.`);
      setMovimiento({ ...movimiento, [producto.id_producto]: {} });
      await cargar();
    } catch (error) {
      setMensaje(error.response?.data?.message || "No se pudo actualizar el stock.");
    }
  };

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><button onClick={() => router.push("/forrajeria")} className="mb-5 text-sm text-emerald-400">← Volver a forrajería</button><h1 className="text-3xl font-bold">Catálogo de productos</h1>{mensaje && <p className="my-4 rounded-lg bg-slate-900 p-3 text-sm text-emerald-300">{mensaje}</p>}<form onSubmit={guardar} className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-6"><input required placeholder="Nombre del producto" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2 sm:col-span-2" /><select value={form.unidad_venta} onChange={(e) => setForm({ ...form, unidad_venta: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2">{unidades.map((unidad) => <option key={unidad}>{unidad}</option>)}</select><input required type="number" min="0" step="0.01" placeholder="Precio" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" /><input type="number" min="0" step="0.01" placeholder="Costo" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" /><input type="number" min="0" step="0.01" placeholder="Stock mínimo" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" /><button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 sm:col-span-6">Agregar producto</button></form><div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Unidad</th><th className="px-4 py-3">Precio</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Mínimo</th><th className="px-4 py-3">Movimiento</th></tr></thead><tbody>{productos.map((producto) => { const datos = movimiento[producto.id_producto] || {}; return <tr key={producto.id_producto} className="border-b border-slate-800"><td className="px-4 py-3 font-medium">{producto.nombre}</td><td className="px-4 py-3 text-slate-400">{producto.unidad_venta}</td><td className="px-4 py-3">${producto.precio}</td><td className={`px-4 py-3 ${Number(producto.stock_actual) <= Number(producto.stock_minimo) ? "text-amber-400" : ""}`}>{producto.stock_actual}</td><td className="px-4 py-3">{producto.stock_minimo}</td><td className="px-4 py-3"><div className="flex min-w-[260px] gap-2"><select value={datos.tipo || "entrada"} onChange={(e) => setMovimiento({ ...movimiento, [producto.id_producto]: { ...datos, tipo: e.target.value } })} className="rounded bg-slate-800 px-2 py-1"><option value="entrada">Entrada</option><option value="salida">Salida</option></select><input type="number" min="0.001" step="0.001" placeholder="Cantidad" value={datos.cantidad || ""} onChange={(e) => setMovimiento({ ...movimiento, [producto.id_producto]: { ...datos, cantidad: e.target.value } })} className="w-24 rounded bg-slate-800 px-2 py-1" /><button onClick={() => registrarMovimiento(producto)} className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold">Aplicar</button></div></td></tr>; })}</tbody></table></div></div></main>;
}
