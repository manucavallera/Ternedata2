"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { plata } from "../ventas";
import { PERIODOS, diaCorto, rangoPeriodo, reporteVentas } from "../reportes";

const Tarjeta = ({ titulo, valor, detalle, destacado }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
    <p className="text-sm text-slate-400">{titulo}</p>
    <p className={`mt-2 text-2xl font-bold sm:text-3xl ${destacado ? "text-emerald-400" : ""}`}>{valor}</p>
    {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
  </div>
);

export default function ReportesVentas() {
  const esDueno = useRolEnCampo() === "admin";
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [periodo, setPeriodo] = useState("mes");
  const [rango, setRango] = useState(() => rangoPeriodo("mes"));
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!esDueno) return;
    Promise.all([businessApi.get("/forrajeria/pedidos", { params: { estado: "entregado" } }), businessApi.get("/forrajeria/productos")])
      .then(([p, prod]) => {
        setPedidos(p.data || []);
        setProductos(prod.data || []);
      })
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar las ventas."))
      .finally(() => setCargando(false));
  }, [esDueno]);

  const r = useMemo(() => reporteVentas(pedidos, productos, rango), [pedidos, productos, rango]);
  const maxDia = Math.max(1, ...r.dias.map((d) => d.total));

  const elegirPeriodo = (clave) => {
    setPeriodo(clave);
    setRango(rangoPeriodo(clave));
  };
  const cambiarFecha = (campo, valor) => {
    setPeriodo("");
    setRango((actual) => ({ ...actual, [campo]: valor }));
  };

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
      <div className="mx-auto max-w-6xl">
        <Link href="/forrajeria" className="text-sm text-emerald-400">← Volver a forrajería</Link>
        <h1 className="mt-4 text-3xl font-bold">Reportes de ventas</h1>
        <p className="mt-1 text-sm text-slate-400">Pedidos entregados en el período, por fecha de entrega.</p>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          {Object.entries(PERIODOS).map(([clave, texto]) => (
            <button key={clave} onClick={() => elegirPeriodo(clave)} className={`rounded-full px-3 py-1 ${periodo === clave ? "bg-emerald-600 font-semibold" : "bg-slate-800 text-slate-300"}`}>
              {texto}
            </button>
          ))}
          <label className="ml-0 flex items-center gap-2 text-slate-400 sm:ml-4">
            Desde
            <input type="date" value={rango.desde} onChange={(e) => cambiarFecha("desde", e.target.value)} className="rounded bg-slate-800 px-2 py-1 text-white" />
          </label>
          <label className="flex items-center gap-2 text-slate-400">
            Hasta
            <input type="date" value={rango.hasta} onChange={(e) => cambiarFecha("hasta", e.target.value)} className="rounded bg-slate-800 px-2 py-1 text-white" />
          </label>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tarjeta titulo="Vendido" valor={cargando ? "-" : plata(r.total)} detalle={`${r.pedidos} ${r.pedidos === 1 ? "pedido" : "pedidos"}`} destacado />
          <Tarjeta titulo="Ganancia estimada" valor={cargando ? "-" : plata(r.ganancia)} detalle={r.margenPct === null ? "Cargá el costo de los productos" : `Margen ${r.margenPct}%`} destacado />
          <Tarjeta titulo="Ticket promedio" valor={cargando ? "-" : plata(r.ticketPromedio)} />
          <Tarjeta titulo="Cobrado al contado" valor={cargando ? "-" : plata(r.contado)} detalle={`${plata(r.credito)} a cuenta corriente`} />
        </div>

        {r.productosSinCosto > 0 && (
          <p className="mt-4 rounded-lg bg-amber-950/40 p-3 text-sm text-amber-300">
            {r.productosSinCosto} {r.productosSinCosto === 1
              ? "producto vendido no tiene costo cargado y no suma"
              : "productos vendidos no tienen costo cargado y no suman"}{" "}
            a la ganancia. Cargalo con &quot;Editar&quot; en <Link href="/forrajeria/productos" className="underline">Productos</Link>.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">La ganancia usa el costo que tiene cargado cada producto hoy.</p>

        {!cargando && r.pedidos === 0 ? (
          <p className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
            No hay pedidos entregados en este período. Las ventas aparecen acá cuando marcás un pedido como entregado.
          </p>
        ) : (
          <>
            <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold">Ventas por día</h2>
              <div className="mt-4 space-y-1.5">
                {r.dias.map((d) => (
                  <div key={d.dia} className="flex items-center gap-3 text-sm">
                    <span className="w-12 shrink-0 text-slate-400">{diaCorto(d.dia)}</span>
                    <div className="h-5 flex-1 rounded bg-slate-800">
                      <div className="h-5 rounded bg-emerald-600" style={{ width: `${(d.total / maxDia) * 100}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right">{plata(d.total)}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
                <h2 className="px-4 pt-4 text-xl font-semibold">Productos más vendidos</h2>
                <table className="mt-2 min-w-full text-left text-sm">
                  <thead className="border-b border-slate-700 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                      <th className="px-4 py-3 text-right font-medium">Vendido</th>
                      <th className="px-4 py-3 text-right font-medium">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {r.productos.map((p) => (
                      <tr key={p.id_producto}>
                        <td className="px-4 py-3 font-medium">{p.nombre}</td>
                        <td className="px-4 py-3 text-right">{p.cantidad} <span className="text-slate-500">{p.unidad_venta}</span></td>
                        <td className="px-4 py-3 text-right">{plata(p.total)}</td>
                        <td className={`px-4 py-3 text-right ${p.ganancia < 0 ? "text-red-400" : ""}`}>{p.ganancia === null ? <span className="text-amber-400">sin costo</span> : plata(p.ganancia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
                <h2 className="px-4 pt-4 text-xl font-semibold">Mejores clientes</h2>
                <table className="mt-2 min-w-full text-left text-sm">
                  <thead className="border-b border-slate-700 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 text-right font-medium">Pedidos</th>
                      <th className="px-4 py-3 text-right font-medium">Compró</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {r.clientes.map((c) => (
                      <tr key={c.id_cliente}>
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/forrajeria/clientes/${c.id_cliente}`} className="hover:text-emerald-400">{c.nombre}</Link>
                        </td>
                        <td className="px-4 py-3 text-right">{c.pedidos}</td>
                        <td className="px-4 py-3 text-right">{plata(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
