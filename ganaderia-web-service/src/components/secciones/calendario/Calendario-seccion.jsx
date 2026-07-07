"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const hoyISO = () => new Date().toISOString().slice(0, 10);

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

// YYYY-MM-DD local sin corrimiento de timezone
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const CalendarioSeccion = () => {
  const { obtenerSnapshotHook, obtenerDiasConCambiosHook } =
    useBussinesMicroservicio();

  const [fecha, setFecha] = useState(hoyISO());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { anio: d.getFullYear(), mes: d.getMonth() }; // mes 0-11
  });

  const [snapshot, setSnapshot] = useState(null);
  const [diasCambio, setDiasCambio] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---- traer snapshot al cambiar fecha ----
  // NOTA: los hooks del microservicio son funciones nuevas en cada render;
  // NO deben ir en deps (dispararía un loop de requests -> 429). Keyed solo en `fecha`.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, status, error: err } = await obtenerSnapshotHook(fecha);
      if (cancelado) return;
      if (err || status >= 400 || !data) {
        setError("No se pudo cargar el estado de esa fecha.");
        setSnapshot(null);
      } else {
        setSnapshot(data);
      }
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  // ---- traer días con cambios del mes visible (keyed en año/mes) ----
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const desde = toISO(new Date(cursor.anio, cursor.mes, 1));
      const hasta = toISO(new Date(cursor.anio, cursor.mes + 1, 0));
      const { data } = await obtenerDiasConCambiosHook(desde, hasta);
      if (cancelado) return;
      setDiasCambio(new Set(Array.isArray(data) ? data : []));
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.anio, cursor.mes]);

  // ---- grilla del mes ----
  const celdas = useMemo(() => {
    const primerDia = new Date(cursor.anio, cursor.mes, 1).getDay();
    const totalDias = new Date(cursor.anio, cursor.mes + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < primerDia; i++) arr.push(null);
    for (let d = 1; d <= totalDias; d++) arr.push(d);
    return arr;
  }, [cursor]);

  const mesPrev = () =>
    setCursor((c) =>
      c.mes === 0 ? { anio: c.anio - 1, mes: 11 } : { anio: c.anio, mes: c.mes - 1 }
    );
  const mesNext = () =>
    setCursor((c) =>
      c.mes === 11 ? { anio: c.anio + 1, mes: 0 } : { anio: c.anio, mes: c.mes + 1 }
    );

  const hoy = hoyISO();

  const resumen = snapshot
    ? [
        { label: "Vacas", n: snapshot.madres?.length || 0, icon: "🐄" },
        { label: "Terneros", n: snapshot.terneros?.length || 0, icon: "🐮" },
        { label: "Rodeos", n: snapshot.rodeos?.length || 0, icon: "🌿" },
        { label: "Dietas", n: snapshot.dietas?.length || 0, icon: "🍽️" },
        { label: "Tratamientos", n: snapshot.tratamientos?.length || 0, icon: "💉" },
        { label: "Eventos", n: snapshot.eventos?.length || 0, icon: "📌" },
      ]
    : [];

  return (
    <div className='max-w-6xl mx-auto px-3 sm:px-6 py-6'>
      <div className='flex items-center gap-2 mb-1'>
        <span className='text-2xl'>📅</span>
        <h1 className='text-xl sm:text-2xl font-bold text-gray-800'>
          Calendario histórico
        </h1>
      </div>
      <p className='text-sm text-gray-500 mb-4'>
        Elegí una fecha y mirá cómo estaba el rodeo ese día.
      </p>

      <div className='bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm rounded-lg px-3 py-2 mb-5'>
        ⚠️ Los datos anteriores a la puesta en marcha del historial se muestran
        como <strong>estado base aproximado</strong>. Desde su activación, cada
        cambio queda registrado y la fecha refleja el estado exacto.
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6'>
        {/* --- Calendario --- */}
        <div className='bg-white rounded-xl shadow border border-gray-100 p-4 h-fit'>
          <div className='flex items-center justify-between mb-3'>
            <button
              onClick={mesPrev}
              className='w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600'
              aria-label='Mes anterior'
            >
              ‹
            </button>
            <span className='font-semibold text-gray-700'>
              {MESES[cursor.mes]} {cursor.anio}
            </span>
            <button
              onClick={mesNext}
              className='w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600'
              aria-label='Mes siguiente'
            >
              ›
            </button>
          </div>

          <div className='grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1'>
            {DIAS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className='grid grid-cols-7 gap-1'>
            {celdas.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const iso = toISO(new Date(cursor.anio, cursor.mes, d));
              const esFuturo = iso > hoy;
              const seleccionado = iso === fecha;
              const tieneCambio = diasCambio.has(iso);
              return (
                <button
                  key={iso}
                  disabled={esFuturo}
                  onClick={() => setFecha(iso)}
                  className={[
                    "relative h-9 rounded-lg text-sm transition-colors",
                    esFuturo
                      ? "text-gray-300 cursor-not-allowed"
                      : "hover:bg-green-50 text-gray-700",
                    seleccionado ? "bg-green-600 text-white hover:bg-green-600" : "",
                  ].join(" ")}
                >
                  {d}
                  {tieneCambio && !seleccionado && (
                    <span className='absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500' />
                  )}
                </button>
              );
            })}
          </div>

          <div className='flex items-center gap-2 mt-3 text-xs text-gray-500'>
            <span className='w-1.5 h-1.5 rounded-full bg-green-500 inline-block' />
            día con cambios
          </div>

          <label className='block mt-4 text-xs text-gray-500'>
            O ingresá la fecha:
            <input
              type='date'
              value={fecha}
              max={hoy}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
              className='mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700'
            />
          </label>
        </div>

        {/* --- Snapshot --- */}
        <div>
          {loading && (
            <div className='text-gray-400 text-sm py-10 text-center'>
              Cargando estado del {fecha}…
            </div>
          )}
          {error && !loading && (
            <div className='text-red-600 text-sm py-4'>{error}</div>
          )}
          {!loading && !error && snapshot && (
            <>
              <div className='grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5'>
                {resumen.map((r) => (
                  <div
                    key={r.label}
                    className='bg-white rounded-lg shadow-sm border border-gray-100 p-3 text-center'
                  >
                    <div className='text-lg'>{r.icon}</div>
                    <div className='text-xl font-bold text-gray-800'>{r.n}</div>
                    <div className='text-[11px] text-gray-500'>{r.label}</div>
                  </div>
                ))}
              </div>

              <Bloque
                titulo='🐄 Vacas'
                items={snapshot.madres}
                vacio='Sin vacas registradas a esa fecha.'
                render={(m) => (
                  <>
                    <span className='font-semibold text-gray-800'>
                      {m.nombre || `RP ${m.rp_madre ?? "—"}`}
                    </span>
                    <Etiqueta>{m.estado || "—"}</Etiqueta>
                    {m.dias_en_leche != null && (
                      <span className='text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5'>
                        DEL {m.dias_en_leche}
                      </span>
                    )}
                    {m.id_rodeo != null && (
                      <span className='text-xs text-gray-400'>rodeo #{m.id_rodeo}</span>
                    )}
                  </>
                )}
              />

              <Bloque
                titulo='🐮 Terneros'
                items={snapshot.terneros}
                vacio='Sin terneros a esa fecha.'
                render={(t) => (
                  <>
                    <span className='font-semibold text-gray-800'>
                      RP {t.rp_ternero ?? "—"}
                    </span>
                    <Etiqueta>{t.sexo || "—"}</Etiqueta>
                    <Etiqueta>{t.estado || "—"}</Etiqueta>
                    {t.peso_nacer != null && (
                      <span className='text-xs text-gray-400'>
                        {t.peso_nacer} kg al nacer
                      </span>
                    )}
                  </>
                )}
              />

              <Bloque
                titulo='🌿 Rodeos'
                items={snapshot.rodeos}
                vacio='Sin rodeos a esa fecha.'
                render={(r) => (
                  <>
                    <span className='font-semibold text-gray-800'>{r.nombre}</span>
                    {r.tipo && <Etiqueta>{r.tipo}</Etiqueta>}
                    <Etiqueta>{r.estado || "—"}</Etiqueta>
                  </>
                )}
              />

              <Bloque
                titulo='🍽️ Dietas por rodeo'
                items={snapshot.dietas}
                vacio='Sin dietas asignadas a esa fecha.'
                render={(d) => (
                  <>
                    <span className='font-semibold text-gray-800'>
                      {d.nombre || `Dieta rodeo #${d.id_rodeo}`}
                    </span>
                    <Etiqueta>{d.modo === "formula" ? "fórmula" : "nota"}</Etiqueta>
                    {d.modo === "formula" ? (
                      <span className='text-xs text-gray-500'>
                        {d.kg_por_animal} kg/animal × {d.cantidad_animales ?? "—"} ={" "}
                        <strong>{d.total_rodeo ?? "—"} kg</strong>
                      </span>
                    ) : (
                      <span className='text-xs text-gray-500'>{d.nota}</span>
                    )}
                    <span className='text-xs text-gray-400'>rodeo #{d.id_rodeo}</span>
                  </>
                )}
              />

              <Bloque
                titulo='💉 Tratamientos (hasta esa fecha)'
                items={snapshot.tratamientos}
                vacio='Sin tratamientos hasta esa fecha.'
                render={(t) => (
                  <>
                    <span className='font-semibold text-gray-800'>{t.nombre}</span>
                    {t.tipo_enfermedad && <Etiqueta>{t.tipo_enfermedad}</Etiqueta>}
                    <span className='text-xs text-gray-400'>
                      {t.fecha_tratamiento}
                    </span>
                  </>
                )}
              />

              <Bloque
                titulo='📌 Eventos (hasta esa fecha)'
                items={snapshot.eventos}
                vacio='Sin eventos hasta esa fecha.'
                render={(e) => (
                  <>
                    <span className='font-semibold text-gray-800'>
                      {e.observacion}
                    </span>
                    <span className='text-xs text-gray-400'>{e.fecha_evento}</span>
                  </>
                )}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Etiqueta = ({ children }) => (
  <span className='text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5'>
    {children}
  </span>
);

const Bloque = ({ titulo, items, vacio, render }) => {
  const [abierto, setAbierto] = useState(true);
  const lista = Array.isArray(items) ? items : [];
  return (
    <div className='mb-4 bg-white rounded-xl shadow-sm border border-gray-100'>
      <button
        onClick={() => setAbierto((a) => !a)}
        className='w-full flex items-center justify-between px-4 py-3 text-left'
      >
        <span className='font-semibold text-gray-700'>
          {titulo}{" "}
          <span className='text-gray-400 font-normal'>({lista.length})</span>
        </span>
        <span className='text-gray-400'>{abierto ? "▾" : "▸"}</span>
      </button>
      {abierto && (
        <div className='px-4 pb-3'>
          {lista.length === 0 ? (
            <p className='text-sm text-gray-400'>{vacio}</p>
          ) : (
            <ul className='divide-y divide-gray-50'>
              {lista.map((it, i) => (
                <li
                  key={i}
                  className='flex flex-wrap items-center gap-2 py-2 text-sm'
                >
                  {render(it)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarioSeccion;
