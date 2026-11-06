"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fechaLarga, filtrarPeriodo, porAnio, porMes, textoMes } from "./produccion";

const PERIODOS = [
  { meses: 3, texto: "3 meses" },
  { meses: 6, texto: "6 meses" },
  { meses: 12, texto: "12 meses" },
  { meses: null, texto: "Todo" },
];

// Un solo color de serie: cada gráfico muestra una sola medida y el título la nombra.
const SERIE = "#0e7490";
const EJE = { fontSize: 11, fill: "#6b7280" };
const numero = (n) => (n == null ? "—" : Number(n).toLocaleString("es-AR"));
const fechaEje = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

function Grafico({ titulo, datos, clave, unidad, tipo = "linea", ejeX = "fecha", formatoX = fechaEje, formatoTip = fechaLarga }) {
  const conDato = datos.filter((d) => d[clave] != null);
  return (
    <figure className="rounded-lg border border-gray-200 p-3" data-grafico={clave}>
      <figcaption className="mb-2 text-sm font-semibold text-gray-700">{titulo}</figcaption>
      {conDato.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Sin datos en el período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          {tipo === "barras" ? (
            <BarChart data={conDato} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey={ejeX} tickFormatter={formatoX} tick={EJE} tickLine={false} axisLine={{ stroke: "#d1d5db" }} />
              <YAxis tick={EJE} tickLine={false} axisLine={false} width={60} tickFormatter={numero} />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                labelFormatter={formatoTip}
                formatter={(v) => [`${numero(v)} ${unidad}`, titulo]}
              />
              <Bar dataKey={clave} fill={SERIE} isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          ) : (
            <LineChart data={conDato} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey={ejeX} tickFormatter={formatoX} tick={EJE} tickLine={false} axisLine={{ stroke: "#d1d5db" }} minTickGap={24} />
              <YAxis tick={EJE} tickLine={false} axisLine={false} width={60} tickFormatter={numero} />
              <Tooltip
                cursor={{ stroke: "#94a3b8" }}
                labelFormatter={formatoTip}
                formatter={(v) => [`${numero(v)} ${unidad}`, titulo]}
              />
              <Line
                type="linear"
                dataKey={clave}
                stroke={SERIE}
                isAnimationActive={false}
                strokeWidth={2}
                dot={conDato.length <= 31 ? { r: 3 } : false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </figure>
  );
}

export default function GraficosProduccion({ dias }) {
  const [meses, setMeses] = useState(3);
  const [vista, setVista] = useState("graficos");

  const periodo = useMemo(() => filtrarPeriodo(dias, meses), [dias, meses]);
  const mensual = useMemo(() => porMes(periodo), [periodo]);
  const anual = useMemo(() => porAnio(porMes(dias)), [dias]);

  if (dias.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-700">Producción</h2>
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.texto}
              onClick={() => setMeses(p.meses)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                meses === p.meses ? "border-slate-800 bg-slate-800 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex gap-4 border-b text-sm">
        {[
          ["graficos", "Gráficos"],
          ["meses", "Por mes"],
          ["anios", "Acumulado por año"],
        ].map(([clave, texto]) => (
          <button
            key={clave}
            onClick={() => setVista(clave)}
            className={`-mb-px border-b-2 pb-2 font-semibold ${vista === clave ? "border-cyan-700 text-cyan-800" : "border-transparent text-gray-500"}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {vista === "graficos" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Grafico titulo="Litros por vaca" datos={periodo} clave="por_vaca" unidad="L" />
          <Grafico titulo="Litros totales por día" datos={periodo} clave="total" unidad="L" />
          <Grafico titulo="Vacas en ordeñe" datos={periodo} clave="vacas" unidad="vacas" />
          <Grafico
            titulo="Litros por mes"
            datos={mensual}
            clave="litros"
            unidad="L"
            tipo="barras"
            ejeX="mes"
            formatoX={textoMes}
            formatoTip={textoMes}
          />
        </div>
      )}

      {vista === "meses" && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" data-tabla="meses">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Mes</th>
                <th className="px-3 py-2 text-right">Litros</th>
                <th className="px-3 py-2 text-right">A fábrica</th>
                <th className="px-3 py-2 text-right">Días cargados</th>
                <th className="px-3 py-2 text-right">Promedio diario</th>
                <th className="px-3 py-2 text-right">L por vaca</th>
              </tr>
            </thead>
            <tbody>
              {[...mensual].reverse().map((m) => (
                <tr key={m.mes} className="border-t border-gray-100">
                  <td className="px-3 py-2">{textoMes(m.mes)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{numero(m.litros)}</td>
                  <td className="px-3 py-2 text-right">{numero(m.fabrica)}</td>
                  <td className="px-3 py-2 text-right">{m.dias}</td>
                  <td className="px-3 py-2 text-right">{numero(m.promedio_diario)}</td>
                  <td className="px-3 py-2 text-right">{numero(m.por_vaca)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === "anios" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {anual.map((a) => (
            <div key={a.anio} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-semibold text-gray-700">{a.anio}</span>
                <span className="text-lg font-bold text-gray-800">{numero(a.litros)} L</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {a.meses.map((m) => (
                    <tr key={m.mes} className="border-t border-gray-100">
                      <td className="py-1">{textoMes(m.mes)}</td>
                      <td className="py-1 text-right">{numero(m.litros)}</td>
                      <td className="py-1 text-right text-gray-500">acum. {numero(m.acumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
