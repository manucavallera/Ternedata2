"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import businessApi from "@/api/bussines-api";
import { CATEGORIAS } from "@/app/tambo/tambo";
import { fechaLarga, filtrarPeriodo, porDia, ultimos30 } from "@/components/secciones/litros/produccion";

const numero = (n) => (n == null ? "—" : Number(n).toLocaleString("es-AR"));
const fechaEje = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

function Dato({ titulo, valor, detalle }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-800/80 p-3 sm:p-4">
      <p className="text-xl font-extrabold leading-tight text-white sm:text-2xl">{valor}</p>
      <p className="text-xs font-medium text-slate-300 sm:text-sm">{titulo}</p>
      {detalle && <p className="text-[11px] text-slate-500 sm:text-xs">{detalle}</p>}
    </div>
  );
}

// Panel del tambo para el dashboard. Solo aparece si el campo tiene vacas en tambo.
// businessApi agrega el campo elegido; `establecimiento` solo dispara la recarga.
export default function PanelTambo({ establecimiento }) {
  const [resumen, setResumen] = useState(null);
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    let vigente = true;
    Promise.all([businessApi.get("/tambo/resumen"), businessApi.get("/litros/listado")])
      .then(([res, litros]) => {
        if (!vigente) return;
        setResumen(res.data);
        setRegistros(litros.data || []);
      })
      // Una forrajería no tiene tambo (403): el panel no se muestra.
      .catch(() => vigente && setResumen(null));
    return () => {
      vigente = false;
    };
  }, [establecimiento]);

  const dias = useMemo(() => porDia(registros), [registros]);
  const mes = useMemo(() => ultimos30(dias), [dias]);
  const serie = useMemo(() => filtrarPeriodo(dias, 3).filter((d) => d.por_vaca != null), [dias]);

  if (!resumen || !(resumen.por_categoria?.["En Tambo"] > 0)) return null;
  const ultimo = dias[dias.length - 1];

  return (
    <section className="mb-4 rounded-xl border border-slate-700 bg-slate-800/60 p-3 sm:mb-6 sm:p-4" data-panel="tambo">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-300">🥛 Tambo</h2>
        <div className="flex gap-3 text-xs font-semibold">
          <Link href="/tambo" className="text-emerald-400 hover:underline">
            Rodeo lechero →
          </Link>
          <Link href="/litros" className="text-emerald-400 hover:underline">
            Producción →
          </Link>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <span key={c} className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
            {c}: {resumen.por_categoria[c] ?? 0}
          </span>
        ))}
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">Total: {resumen.total}</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Dato
          titulo="Días en leche promedio"
          valor={resumen.promedio_dias_en_leche ?? "—"}
          detalle={`${resumen.vacas_con_parto ?? 0} ${resumen.vacas_con_parto === 1 ? "vaca" : "vacas"} de tambo con fecha de parto`}
        />
        <Dato titulo="Litros últimos 30 días" valor={numero(mes.litros)} detalle={`${mes.dias} ${mes.dias === 1 ? "día cargado" : "días cargados"}`} />
        <Dato titulo="A fábrica últimos 30 días" valor={numero(mes.fabrica)} />
        <Dato
          titulo="Litros por vaca"
          valor={ultimo?.por_vaca != null ? numero(ultimo.por_vaca) : "—"}
          detalle={ultimo ? `Último registro ${fechaLarga(ultimo.fecha)}` : "Sin registros de litros"}
        />
      </div>

      {serie.length > 1 && (
        <figure data-grafico="panel_por_vaca">
          <figcaption className="mb-2 text-xs font-semibold text-slate-400">Litros por vaca, últimos 3 meses</figcaption>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={serie} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#334155" />
              <XAxis dataKey="fecha" tickFormatter={fechaEje} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
                labelFormatter={fechaLarga}
                formatter={(v) => [`${numero(v)} L`, "Litros por vaca"]}
              />
              <Line type="linear" dataKey="por_vaca" stroke="#2dd4bf" strokeWidth={2} dot={serie.length <= 31 ? { r: 3 } : false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </figure>
      )}
    </section>
  );
}
