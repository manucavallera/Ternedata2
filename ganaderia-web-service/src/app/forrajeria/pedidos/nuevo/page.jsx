"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import businessApi from "@/api/bussines-api";
import { coincideCliente, plata, totalPedido } from "../../ventas";

const lineaVacia = () => ({ clave: Math.random().toString(36).slice(2), id_producto: "", cantidad: "" });

function NuevoPedido() {
  const router = useRouter();
  const params = useSearchParams();
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [idCliente, setIdCliente] = useState(params.get("cliente") || "");
  const [buscarCliente, setBuscarCliente] = useState("");
  const [lineas, setLineas] = useState([lineaVacia()]);
  const [entrega, setEntrega] = useState({ forma_entrega: "retiro", direccion_entrega: "", zona_entrega: "" });
  const [formaPago, setFormaPago] = useState("contado");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([businessApi.get("/forrajeria/contactos?tipo=cliente"), businessApi.get("/forrajeria/productos")])
      .then(([c, p]) => {
        setClientes((c.data || []).filter((x) => x.estado !== "inactivo"));
        setProductos((p.data || []).filter((x) => x.estado !== "inactivo"));
      })
      .catch(() => setError("No se pudieron cargar clientes y productos."));
  }, []);

  const cliente = clientes.find((c) => String(c.id_contacto) === String(idCliente));
  const productoPorId = useMemo(() => new Map(productos.map((p) => [String(p.id_producto), p])), [productos]);
  const lineasConPrecio = lineas.map((l) => ({ ...l, precio: productoPorId.get(String(l.id_producto))?.precio || 0 }));
  const total = totalPedido(lineasConPrecio);

  // Al elegir cliente con reparto, completa dirección y zona desde su ficha.
  const elegirCliente = (id) => {
    setIdCliente(id);
    const c = clientes.find((x) => String(x.id_contacto) === String(id));
    if (c) setEntrega((e) => ({ ...e, direccion_entrega: c.direccion || "", zona_entrega: c.zona || "" }));
  };

  const cambiarLinea = (clave, cambios) => setLineas(lineas.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));

  const enviar = async (event) => {
    event.preventDefault();
    setError("");
    const items = lineas
      .filter((l) => l.id_producto && Number(l.cantidad) > 0)
      .map((l) => ({ id_producto: Number(l.id_producto), cantidad: Number(l.cantidad) }));
    if (!cliente) return setError("Elegí un cliente.");
    if (!items.length) return setError("Agregá al menos un producto con cantidad.");
    if (new Set(items.map((i) => i.id_producto)).size !== items.length) return setError("Hay un producto repetido: juntá las cantidades en una sola línea.");
    if (entrega.forma_entrega === "reparto" && !entrega.direccion_entrega.trim()) return setError("Para reparto indicá la dirección.");

    const cuerpo = { id_cliente: cliente.id_contacto, items, forma_entrega: entrega.forma_entrega, forma_pago: formaPago };
    if (entrega.forma_entrega === "reparto") {
      cuerpo.direccion_entrega = entrega.direccion_entrega.trim();
      if (entrega.zona_entrega.trim()) cuerpo.zona_entrega = entrega.zona_entrega.trim();
    }
    if (observaciones.trim()) cuerpo.observaciones = observaciones.trim();

    setEnviando(true);
    try {
      await businessApi.post("/forrajeria/pedidos", cuerpo);
      router.push("/forrajeria/pedidos");
    } catch (err) {
      const m = err.response?.data?.message;
      setError(Array.isArray(m) ? m.join(". ") : m || "No se pudo crear el pedido.");
      setEnviando(false);
    }
  };

  const clientesFiltrados = clientes.filter((c) => coincideCliente(c, buscarCliente));
  const sinPrecio = lineasConPrecio.some((l) => l.id_producto && Number(l.precio) === 0);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <form onSubmit={enviar} className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/forrajeria/pedidos" className="text-sm text-emerald-400">← Volver a pedidos</Link>
        <h1 className="text-3xl font-bold">Nuevo pedido</h1>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 font-semibold">Cliente</h2>
          {clientes.length === 0 ? (
            <p className="text-sm text-slate-400">
              No hay clientes cargados. <Link href="/forrajeria/clientes" className="text-emerald-400 underline">Cargá uno primero</Link>.
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="search" placeholder="Buscar" value={buscarCliente} onChange={(e) => setBuscarCliente(e.target.value)} className="rounded-lg bg-slate-800 px-3 py-2 sm:w-40" />
              <select value={idCliente} onChange={(e) => elegirCliente(e.target.value)} className="flex-1 rounded-lg bg-slate-800 px-3 py-2">
                <option value="">Elegí un cliente</option>
                {clientesFiltrados.map((c) => (
                  <option key={c.id_contacto} value={c.id_contacto}>{c.nombre}{c.zona ? ` (${c.zona})` : ""}</option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 font-semibold">Productos</h2>
          <div className="flex flex-col gap-2">
            {lineasConPrecio.map((l) => {
              const prod = productoPorId.get(String(l.id_producto));
              return (
                <div key={l.clave} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
                  <select value={l.id_producto} onChange={(e) => cambiarLinea(l.clave, { id_producto: e.target.value })} className="min-w-0 rounded-lg bg-slate-800 px-3 py-2">
                    <option value="">Producto</option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>{p.nombre} ({plata(p.precio)} / {p.unidad_venta}, stock {Number(p.stock_actual)})</option>
                    ))}
                  </select>
                  <input type="number" min="0.001" step="0.001" placeholder={prod?.unidad_venta || "Cant."} value={l.cantidad} onChange={(e) => cambiarLinea(l.clave, { cantidad: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2" />
                  <span className="hidden text-right text-sm text-slate-300 sm:block">{plata((Number(l.cantidad) || 0) * Number(l.precio))}</span>
                  <button type="button" onClick={() => setLineas(lineas.length > 1 ? lineas.filter((x) => x.clave !== l.clave) : [lineaVacia()])} className="rounded-lg px-2 py-2 text-slate-400 hover:bg-slate-800" aria-label="Quitar producto">✕</button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => setLineas([...lineas, lineaVacia()])} className="mt-3 text-sm text-emerald-400 hover:text-emerald-300">+ Agregar producto</button>
          {sinPrecio && <p className="mt-2 text-sm text-amber-400">Hay productos sin precio: van a salir a $0. Cargale el precio en Productos.</p>}
        </section>

        <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 font-semibold">Entrega</legend>
            {[["retiro", "Retira en el local"], ["reparto", "Reparto"]].map(([v, t]) => (
              <label key={v} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input type="radio" name="entrega" checked={entrega.forma_entrega === v} onChange={() => setEntrega({ ...entrega, forma_entrega: v })} /> {t}
              </label>
            ))}
            {entrega.forma_entrega === "reparto" && (
              <div className="mt-3 flex flex-col gap-2">
                <input placeholder="Dirección" maxLength={200} value={entrega.direccion_entrega} onChange={(e) => setEntrega({ ...entrega, direccion_entrega: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2 text-sm" />
                <input placeholder="Zona" maxLength={100} value={entrega.zona_entrega} onChange={(e) => setEntrega({ ...entrega, zona_entrega: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2 text-sm" />
              </div>
            )}
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">Pago</legend>
            {[["contado", "Contado"], ["credito", "Cuenta corriente"]].map(([v, t]) => (
              <label key={v} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input type="radio" name="pago" checked={formaPago === v} onChange={() => setFormaPago(v)} /> {t}
              </label>
            ))}
            {formaPago === "credito" && <p className="mt-2 text-xs text-slate-400">Se carga en la cuenta del cliente cuando se entrega.</p>}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-semibold">Nota</span>
            <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="rounded-lg bg-slate-800 px-3 py-2" />
          </label>
        </section>

        {error && <p className="rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}

        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <p className="text-sm text-slate-400">Total</p>
            <p className="text-2xl font-bold">{plata(total)}</p>
          </div>
          <button disabled={enviando} className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50">
            {enviando ? "Guardando..." : "Crear pedido"}
          </button>
        </div>
        <p className="text-xs text-slate-500">El pedido queda pendiente. El stock se descuenta al confirmarlo.</p>
      </form>
    </main>
  );
}

// useSearchParams necesita Suspense en Next.
export default function Pagina() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 p-8 text-slate-400">Cargando...</main>}>
      <NuevoPedido />
    </Suspense>
  );
}
