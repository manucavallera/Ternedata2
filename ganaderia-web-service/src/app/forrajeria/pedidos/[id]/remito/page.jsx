"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import businessApi from "@/api/bussines-api";
import { etiquetaEstado, plata, textoRemito } from "../../../ventas";

const fecha = (valor) => new Date(valor).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function Remito() {
  const { id } = useParams();
  const { establecimientoActual, misEstablecimientos, userPayload } = useSelector((state) => state.auth);
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    businessApi
      .get(`/forrajeria/pedidos/${id}`)
      .then(({ data }) => setPedido(data))
      .catch((err) => setError(err.response?.data?.message || "No se pudo cargar el pedido."));
  }, [id]);

  const campo = (misEstablecimientos || []).find(
    (e) => Number(e.id_establecimiento) === Number(establecimientoActual ?? userPayload?.id_establecimiento)
  );
  const negocio = campo?.nombre || "Forrajería";

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/forrajeria/pedidos" className="text-sm text-emerald-400">← Volver a pedidos</Link>
        <p className="mt-4 text-red-200">{error}</p>
      </main>
    );
  }
  if (!pedido) return <main className="min-h-screen bg-slate-950 p-8 text-slate-400">Cargando...</main>;

  const telefono = (pedido.cliente?.whatsapp || pedido.cliente?.telefono || "").replace(/\D/g, "");
  const linkWhatsApp = `https://wa.me/${telefono}?text=${encodeURIComponent(textoRemito(pedido, negocio))}`;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/forrajeria/pedidos" className="text-sm text-emerald-400">← Volver a pedidos</Link>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Imprimir</button>
            <a
              href={linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
              title={telefono ? "" : "El cliente no tiene teléfono: WhatsApp te va a pedir elegir el contacto"}
            >
              Enviar por WhatsApp
            </a>
          </div>
        </div>
        {!telefono && <p className="mb-4 text-sm text-amber-400 print:hidden">El cliente no tiene WhatsApp ni teléfono cargado: vas a tener que elegir el contacto en WhatsApp.</p>}

        <article className="rounded-xl bg-white p-8 text-slate-900 shadow-xl print:rounded-none print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xl font-bold">{negocio}</p>
              <p className="text-sm text-slate-500">Remito de pedido #{pedido.id_pedido}</p>
            </div>
            <div className="text-right text-sm">
              <p>Fecha: {fecha(pedido.fecha_creacion)}</p>
              <p className="text-slate-500">Estado: {etiquetaEstado(pedido.estado)}</p>
            </div>
          </header>

          <section className="mt-4 grid gap-1 text-sm">
            <p><span className="text-slate-500">Cliente:</span> <strong>{pedido.cliente?.nombre || "-"}</strong></p>
            {pedido.cliente?.documento && <p><span className="text-slate-500">CUIT / DNI:</span> {pedido.cliente.documento}</p>}
            <p>
              <span className="text-slate-500">Entrega:</span>{" "}
              {pedido.forma_entrega === "reparto" ? `Reparto a ${pedido.direccion_entrega || pedido.cliente?.direccion || "-"}${pedido.zona_entrega ? ` (${pedido.zona_entrega})` : ""}` : "Retira en el local"}
            </p>
            <p><span className="text-slate-500">Pago:</span> {pedido.forma_pago === "credito" ? "Cuenta corriente" : "Contado"}</p>
          </section>

          <table className="mt-6 w-full text-left text-sm">
            <thead className="border-b border-slate-300 text-slate-500">
              <tr>
                <th className="py-2 font-medium">Producto</th>
                <th className="py-2 text-right font-medium">Cantidad</th>
                <th className="py-2 text-right font-medium">Precio</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pedido.items.map((i) => (
                <tr key={i.id_item}>
                  <td className="py-2">{i.producto?.nombre || "Producto"}</td>
                  <td className="py-2 text-right">{Number(i.cantidad)} {i.producto?.unidad_venta || ""}</td>
                  <td className="py-2 text-right">{plata(i.precio_unitario)}</td>
                  <td className="py-2 text-right">{plata(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 border-t border-slate-300 pt-4 text-right text-xl font-bold">Total {plata(pedido.total)}</p>
          {pedido.observaciones && <p className="mt-4 text-sm text-slate-600">Nota: {pedido.observaciones}</p>}

          <div className="mt-16 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
            <p className="border-t border-slate-400 pt-2">Entregó</p>
            <p className="border-t border-slate-400 pt-2">Recibió conforme</p>
          </div>
        </article>
      </div>
    </main>
  );
}
