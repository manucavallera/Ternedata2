"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { crearMovimientoStock } from "./movimiento";

const unidades = ["kg", "bolsa", "fardo", "rollo", "tonelada", "unidad"];

export default function ProductosForrajeria() {
  const router = useRouter();
  const esDueno = useRolEnCampo() === "admin";
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({ nombre: "", unidad_venta: "kg", precio: "", costo: "", stock_minimo: "" });
  const [mensaje, setMensaje] = useState("");
  const [movimiento, setMovimiento] = useState({});
  // Producto en edición: { id, precio, costo, stock_minimo }
  const [edicion, setEdicion] = useState(null);
  const [verInactivos, setVerInactivos] = useState(false);

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

  const cargarCatalogoBase = async () => {
    if (!window.confirm("Se agregan los productos típicos de una forrajería (fardos, granos, balanceados, etc.) con precio y stock en 0. No se duplica lo que ya tenés. ¿Seguir?")) return;
    try {
      const { data } = await businessApi.post("/forrajeria/catalogo-base");
      setMensaje(data.productos ? `Se agregaron ${data.productos} productos. Completá los precios.` : "Ya tenías todo el catálogo base.");
      await cargar();
    } catch (error) {
      setMensaje(error.response?.data?.message || "No se pudo cargar el catálogo base.");
    }
  };

  const guardarEdicion = async () => {
    try {
      await businessApi.patch(`/forrajeria/productos/${edicion.id}`, {
        precio: Number(edicion.precio),
        costo: Number(edicion.costo),
        stock_minimo: Number(edicion.stock_minimo),
      });
      setMensaje("Producto actualizado.");
      setEdicion(null);
      await cargar();
    } catch (error) {
      setMensaje(error.response?.data?.message || "No se pudo actualizar el producto.");
    }
  };

  // Dar de baja no borra: los pedidos viejos lo siguen mostrando y se puede reactivar.
  const cambiarEstado = async (producto) => {
    const nuevo = producto.estado === "inactivo" ? "activo" : "inactivo";
    if (nuevo === "inactivo" && !window.confirm(`¿Dar de baja "${producto.nombre}"? No se podrá vender hasta reactivarlo.`)) return;
    try {
      await businessApi.patch(`/forrajeria/productos/${producto.id_producto}`, { estado: nuevo });
      setMensaje(nuevo === "inactivo" ? `"${producto.nombre}" dado de baja.` : `"${producto.nombre}" reactivado.`);
      await cargar();
    } catch (error) {
      setMensaje(error.response?.data?.message || "No se pudo cambiar el estado.");
    }
  };

  const visibles = productos.filter((p) => verInactivos || p.estado !== "inactivo");
  const inactivos = productos.length - productos.filter((p) => p.estado !== "inactivo").length;

  const registrarMovimiento = async (producto) => {
    const datos = movimiento[producto.id_producto] || {};
    const tipo = datos.tipo || "entrada";
    // En un ajuste se pone lo contado en el galpón (puede ser 0).
    if (datos.cantidad === undefined || datos.cantidad === "" || Number(datos.cantidad) < 0 || (tipo !== "ajuste" && Number(datos.cantidad) === 0)) {
      setMensaje(tipo === "ajuste" ? "Indicá cuánto contaste." : "Indicá una cantidad mayor a cero.");
      return;
    }
    if (tipo === "ajuste" && !window.confirm(`El stock de "${producto.nombre}" pasa de ${Number(producto.stock_actual)} a ${Number(datos.cantidad)}. ¿Seguir?`)) return;
    try {
      await businessApi.post(
        `/forrajeria/inventario/productos/${producto.id_producto}/movimientos`,
        crearMovimientoStock(tipo, datos.cantidad, datos.motivo)
      );
      setMensaje(`Stock actualizado: ${producto.nombre}.`);
      setMovimiento({ ...movimiento, [producto.id_producto]: {} });
      await cargar();
    } catch (error) {
      setMensaje(error.response?.data?.message || "No se pudo actualizar el stock.");
    }
  };

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><button onClick={() => router.push("/forrajeria")} className="mb-5 text-sm text-emerald-400">← Volver a forrajería</button><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Catálogo de productos</h1><div className="flex flex-wrap gap-2"><Link href="/forrajeria/productos/historial" className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Historial de stock</Link>{esDueno && <Link href="/forrajeria/productos/valorizado" className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Stock y ganancia</Link>}<button type="button" onClick={cargarCatalogoBase} className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-900/40">Cargar catálogo base</button></div></div>{mensaje && <p className="my-4 rounded-lg bg-slate-900 p-3 text-sm text-emerald-300">{mensaje}</p>}<form onSubmit={guardar} className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-6"><input required placeholder="Nombre del producto" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2 sm:col-span-2" /><select value={form.unidad_venta} onChange={(e) => setForm({ ...form, unidad_venta: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2">{unidades.map((unidad) => <option key={unidad}>{unidad}</option>)}</select><input required type="number" min="0" step="0.01" placeholder="Precio" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" /><input type="number" min="0" step="0.01" placeholder="Costo" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" /><input type="number" min="0" step="0.01" placeholder="Stock mínimo" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" /><button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 sm:col-span-6">Agregar producto</button></form>{inactivos > 0 && <label className="mt-6 flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />Mostrar dados de baja ({inactivos})</label>}<div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Unidad</th><th className="px-4 py-3">Precio</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Mínimo</th><th className="px-4 py-3">Movimiento</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>{visibles.map((producto) => { const datos = movimiento[producto.id_producto] || {}; const editando = edicion?.id === producto.id_producto; const campo = (nombre) => <input type="number" min="0" step="0.01" value={edicion[nombre]} onChange={(e) => setEdicion({ ...edicion, [nombre]: e.target.value })} className="w-24 rounded bg-slate-800 px-2 py-1" />; return <tr key={producto.id_producto} className={`border-b border-slate-800 ${producto.estado === "inactivo" ? "opacity-50" : ""}`}><td className="px-4 py-3 font-medium">{producto.nombre}{producto.estado === "inactivo" && <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-xs">de baja</span>}</td><td className="px-4 py-3 text-slate-400">{producto.unidad_venta}</td><td className="px-4 py-3">{editando ? <div className="flex flex-col gap-1">{campo("precio")}<span className="text-xs text-slate-400">Costo</span>{campo("costo")}</div> : <>${producto.precio}{Number(producto.precio) === 0 && <span className="ml-2 text-xs text-amber-400">sin precio</span>}</>}</td><td className={`px-4 py-3 ${Number(producto.stock_minimo) > 0 && Number(producto.stock_actual) <= Number(producto.stock_minimo) ? "text-amber-400" : ""}`}>{producto.stock_actual}</td><td className="px-4 py-3">{editando ? campo("stock_minimo") : producto.stock_minimo}</td><td className="px-4 py-3"><div className="flex min-w-[380px] gap-2"><select value={datos.tipo || "entrada"} onChange={(e) => setMovimiento({ ...movimiento, [producto.id_producto]: { ...datos, tipo: e.target.value } })} className="rounded bg-slate-800 px-2 py-1"><option value="entrada">Entrada</option>{esDueno && <option value="salida">Salida</option>}{esDueno && <option value="ajuste">Ajuste (contado)</option>}</select><input type="number" min="0" step="0.001" placeholder={datos.tipo === "ajuste" ? "Contado" : "Cantidad"} value={datos.cantidad ?? ""} onChange={(e) => setMovimiento({ ...movimiento, [producto.id_producto]: { ...datos, cantidad: e.target.value } })} className="w-24 rounded bg-slate-800 px-2 py-1" /><input placeholder="Motivo" maxLength={200} value={datos.motivo || ""} onChange={(e) => setMovimiento({ ...movimiento, [producto.id_producto]: { ...datos, motivo: e.target.value } })} className="w-28 rounded bg-slate-800 px-2 py-1" /><button onClick={() => registrarMovimiento(producto)} className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold">Aplicar</button></div></td><td className="px-4 py-3"><div className="flex gap-2 whitespace-nowrap">{editando ? <><button onClick={guardarEdicion} className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold">Guardar</button><button onClick={() => setEdicion(null)} className="rounded bg-slate-700 px-2 py-1 text-xs">Cancelar</button></> : <><button onClick={() => setEdicion({ id: producto.id_producto, precio: producto.precio, costo: producto.costo ?? 0, stock_minimo: producto.stock_minimo })} className="rounded bg-slate-700 px-2 py-1 text-xs">Editar</button><button onClick={() => cambiarEstado(producto)} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{producto.estado === "inactivo" ? "Reactivar" : "Dar de baja"}</button></>}</div></td></tr>; })}</tbody></table></div></div></main>;
}
