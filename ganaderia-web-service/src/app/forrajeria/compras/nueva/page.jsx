"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { plata } from "../../ventas";
import { armarItems, totalCompra } from "../../compras";

const lineaVacia = () => ({ clave: Math.random().toString(36).slice(2), id_producto: "", cantidad: "", costo: "" });

function NuevaCompra() {
  const router = useRouter();
  const params = useSearchParams();
  const esDueno = useRolEnCampo() === "admin";
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [idProveedor, setIdProveedor] = useState(params.get("proveedor") || "");
  const [lineas, setLineas] = useState([lineaVacia()]);
  const [formaPago, setFormaPago] = useState("contado");
  const [comprobante, setComprobante] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [actualizarCosto, setActualizarCosto] = useState(true);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([businessApi.get("/forrajeria/contactos?tipo=proveedor"), businessApi.get("/forrajeria/productos")])
      .then(([c, p]) => {
        setProveedores((c.data || []).filter((x) => x.estado !== "inactivo"));
        setProductos((p.data || []).filter((x) => x.estado !== "inactivo"));
      })
      .catch(() => setError("No se pudieron cargar proveedores y productos."));
  }, []);

  const productoPorId = useMemo(() => new Map(productos.map((p) => [String(p.id_producto), p])), [productos]);
  const total = totalCompra(lineas);
  const proveedor = proveedores.find((p) => String(p.id_contacto) === String(idProveedor));

  const cambiarLinea = (clave, cambios) => setLineas(lineas.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  // Al elegir el producto propone el último costo cargado.
  const elegirProducto = (clave, id) => {
    const p = productoPorId.get(String(id));
    cambiarLinea(clave, { id_producto: id, costo: p && Number(p.costo) > 0 ? String(Number(p.costo)) : "" });
  };

  const enviar = async (event) => {
    event.preventDefault();
    setError("");
    if (!proveedor) return setError("Elegí un proveedor.");
    const { items, error: errorItems } = armarItems(lineas);
    if (errorItems) return setError(errorItems);
    const cuerpo = { id_proveedor: proveedor.id_contacto, items, forma_pago: formaPago, actualizar_costo: actualizarCosto };
    if (comprobante.trim()) cuerpo.comprobante = comprobante.trim();
    if (observaciones.trim()) cuerpo.observaciones = observaciones.trim();
    setEnviando(true);
    try {
      await businessApi.post("/forrajeria/compras", cuerpo);
      router.push(`/forrajeria/proveedores/${proveedor.id_contacto}`);
    } catch (err) {
      const m = err.response?.data?.message;
      setError(Array.isArray(m) ? m.join(". ") : m || "No se pudo registrar la compra.");
      setEnviando(false);
    }
  };

  if (!esDueno) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/forrajeria" className="text-sm text-emerald-400">← Volver a forrajería</Link>
        <p className="mt-4 text-slate-400">Las compras las registra el dueño.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <form onSubmit={enviar} className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/forrajeria/compras" className="text-sm text-emerald-400">← Volver a compras</Link>
        <h1 className="text-3xl font-bold">Nueva compra</h1>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 font-semibold">Proveedor</h2>
          {proveedores.length === 0 ? (
            <p className="text-sm text-slate-400">
              No hay proveedores cargados. <Link href="/forrajeria/proveedores" className="text-emerald-400 underline">Cargá uno primero</Link>.
            </p>
          ) : (
            <select aria-label="Proveedor" value={idProveedor} onChange={(e) => setIdProveedor(e.target.value)} className="w-full rounded-lg bg-slate-800 px-3 py-2">
              <option value="">Elegí un proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id_contacto} value={p.id_contacto}>{p.nombre}</option>
              ))}
            </select>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 font-semibold">Productos</h2>
          <div className="mb-1 hidden grid-cols-[1fr_6rem_7rem_6rem_auto] gap-2 px-1 text-xs text-slate-400 sm:grid">
            <span>Producto</span><span>Cantidad</span><span>Costo unitario</span><span className="text-right">Subtotal</span><span />
          </div>
          <div className="flex flex-col gap-2">
            {lineas.map((l) => {
              const prod = productoPorId.get(String(l.id_producto));
              return (
                <div key={l.clave} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-slate-800 p-2 sm:grid-cols-[1fr_6rem_7rem_6rem_auto] sm:border-0 sm:p-0">
                  <select aria-label="Producto" value={l.id_producto} onChange={(e) => elegirProducto(l.clave, e.target.value)} className="min-w-0 rounded-lg bg-slate-800 px-3 py-2">
                    <option value="">Producto</option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>{p.nombre} ({p.unidad_venta}, stock {Number(p.stock_actual)})</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setLineas(lineas.length > 1 ? lineas.filter((x) => x.clave !== l.clave) : [lineaVacia()])} className="rounded-lg px-2 py-2 text-slate-400 hover:bg-slate-800 sm:order-last" aria-label="Quitar producto">✕</button>
                  <div className="col-span-2 grid grid-cols-3 items-center gap-2 sm:contents">
                    <input type="number" min="0.001" step="0.001" aria-label="Cantidad" placeholder={prod?.unidad_venta || "Cant."} value={l.cantidad} onChange={(e) => cambiarLinea(l.clave, { cantidad: e.target.value })} className="min-w-0 rounded-lg bg-slate-800 px-3 py-2" />
                    <input type="number" min="0" step="0.01" aria-label="Costo unitario" placeholder="Costo $" value={l.costo} onChange={(e) => cambiarLinea(l.clave, { costo: e.target.value })} className="min-w-0 rounded-lg bg-slate-800 px-3 py-2" />
                    <span className="text-right text-sm text-slate-300">{plata((Number(l.cantidad) || 0) * (Number(l.costo) || 0))}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => setLineas([...lineas, lineaVacia()])} className="mt-3 text-sm text-emerald-400 hover:text-emerald-300">+ Agregar producto</button>
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-300">
            <input type="checkbox" className="mt-1" checked={actualizarCosto} onChange={(e) => setActualizarCosto(e.target.checked)} />
            <span>Actualizar el costo de cada producto con el de esta compra (se usa para la ganancia)</span>
          </label>
        </section>

        <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 font-semibold">Pago</legend>
            {[["contado", "Pagada"], ["credito", "A pagar (cuenta corriente)"]].map(([v, t]) => (
              <label key={v} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input type="radio" name="pago" checked={formaPago === v} onChange={() => setFormaPago(v)} /> {t}
              </label>
            ))}
            {formaPago === "credito" && <p className="mt-2 text-xs text-slate-400">Queda como deuda con el proveedor hasta que le registres el pago.</p>}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Factura o remito</span>
            <input maxLength={60} placeholder="Ej. A-0001-00001234" value={comprobante} onChange={(e) => setComprobante(e.target.value)} className="rounded-lg bg-slate-800 px-3 py-2" />
          </label>
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
            {enviando ? "Guardando..." : "Registrar compra"}
          </button>
        </div>
        <p className="text-xs text-slate-500">La mercadería se suma al stock en el momento.</p>
      </form>
    </main>
  );
}

// useSearchParams necesita Suspense en Next.
export default function Pagina() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 p-8 text-slate-400">Cargando...</main>}>
      <NuevaCompra />
    </Suspense>
  );
}
