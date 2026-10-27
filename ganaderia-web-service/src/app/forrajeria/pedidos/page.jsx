"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { ESTADOS, etiquetaEstado, plata, sePuedeCancelar, siguientePaso } from "../ventas";

// "En curso" agrupa todo lo que falta entregar.
const FILTROS = [{ valor: "en_curso", etiqueta: "En curso" }, ...ESTADOS.slice(4), { valor: "", etiqueta: "Todos" }];
const EN_CURSO = ["pendiente", "confirmado", "preparando", "listo"];

const COLOR = {
  pendiente: "bg-slate-700 text-slate-200",
  confirmado: "bg-sky-900 text-sky-200",
  preparando: "bg-amber-900 text-amber-200",
  listo: "bg-emerald-900 text-emerald-200",
  entregado: "bg-slate-800 text-slate-400",
  cancelado: "bg-red-950 text-red-300",
};

const fecha = (valor) =>
  new Date(valor).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function PedidosForrajeria() {
  const { establecimientoActual } = useSelector((state) => state.auth);
  const esDueno = useRolEnCampo() === "admin";
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("en_curso");
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const query = filtro && filtro !== "en_curso" ? `?estado=${filtro}` : "";
      const { data } = await businessApi.get(`/forrajeria/pedidos${query}`);
      setPedidos(filtro === "en_curso" ? (data || []).filter((p) => EN_CURSO.includes(p.estado)) : data || []);
    } catch (error) {
      setMensaje({ error: true, texto: error.response?.data?.message || "No se pudieron cargar los pedidos." });
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar, establecimientoActual]);

  const cambiarEstado = async (pedido, estado) => {
    if (estado === "cancelado") {
      const devuelve = ["confirmado", "preparando"].includes(pedido.estado) ? " El stock vuelve al galpón." : "";
      if (!window.confirm(`¿Cancelar el pedido #${pedido.id_pedido} de ${pedido.cliente?.nombre || "cliente"}?${devuelve}`)) return;
    }
    if (estado === "entregado" && pedido.forma_pago === "credito") {
      if (!window.confirm(`Al entregar, ${plata(pedido.total)} se cargan en la cuenta corriente de ${pedido.cliente?.nombre || "el cliente"}. ¿Seguir?`)) return;
    }
    setOcupado(pedido.id_pedido);
    setMensaje(null);
    try {
      await businessApi.patch(`/forrajeria/pedidos/${pedido.id_pedido}/estado`, { estado });
      setMensaje({ texto: `Pedido #${pedido.id_pedido}: ${etiquetaEstado(estado).toLowerCase()}.` });
      await cargar();
    } catch (error) {
      const m = error.response?.data?.message;
      setMensaje({
        error: true,
        texto: m === "Stock insuficiente para confirmar el pedido" ? "No hay stock suficiente para confirmar este pedido. Cargá la entrada de mercadería en Productos." : m || "No se pudo cambiar el estado.",
      });
    } finally {
      setOcupado(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/forrajeria" className="text-sm text-emerald-400">← Volver a forrajería</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <Link href="/forrajeria/pedidos/nuevo" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Nuevo pedido</Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`rounded-full px-3 py-1 text-sm ${filtro === f.valor ? "bg-emerald-600 font-semibold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        {mensaje && (
          <p className={`mt-4 rounded-lg p-3 text-sm ${mensaje.error ? "bg-red-950/60 text-red-200" : "bg-slate-900 text-emerald-300"}`}>{mensaje.texto}</p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {cargando ? (
            <p className="text-slate-400">Cargando...</p>
          ) : pedidos.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
              {filtro === "en_curso" ? "No hay pedidos pendientes de entregar." : "No hay pedidos con este estado."}
            </p>
          ) : (
            pedidos.map((p) => {
              const paso = siguientePaso(p.estado);
              return (
                <article key={p.id_pedido} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        #{p.id_pedido}{" "}
                        {p.cliente ? (
                          <Link href={`/forrajeria/clientes/${p.cliente.id_contacto}`} className="hover:text-emerald-300">{p.cliente.nombre}</Link>
                        ) : (
                          "Cliente"
                        )}
                        <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${COLOR[p.estado]}`}>{etiquetaEstado(p.estado)}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {fecha(p.fecha_creacion)} · {p.forma_entrega === "reparto" ? `Reparto${p.zona_entrega ? ` a ${p.zona_entrega}` : ""}` : "Retira"} · {p.forma_pago === "credito" ? "Cuenta corriente" : "Contado"}
                      </p>
                    </div>
                    <p className="text-xl font-bold">{plata(p.total)}</p>
                  </div>
                  <ul className="mt-3 text-sm text-slate-300">
                    {p.items.map((i) => (
                      <li key={i.id_item}>
                        {Number(i.cantidad)} {i.producto?.unidad_venta || ""} {i.producto?.nombre || "producto"}{" "}
                        <span className="text-slate-500">· {plata(i.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                  {p.direccion_entrega && <p className="mt-2 text-sm text-slate-400">Dirección: {p.direccion_entrega}</p>}
                  {p.observaciones && <p className="mt-1 text-sm text-slate-400">Nota: {p.observaciones}</p>}
                  {(paso || (esDueno && sePuedeCancelar(p.estado))) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {paso && (
                        <button disabled={ocupado === p.id_pedido} onClick={() => cambiarEstado(p, paso.estado)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">
                          {paso.accion}
                        </button>
                      )}
                      {esDueno && sePuedeCancelar(p.estado) && (
                        <button disabled={ocupado === p.id_pedido} onClick={() => cambiarEstado(p, "cancelado")} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50">
                          Cancelar pedido
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
