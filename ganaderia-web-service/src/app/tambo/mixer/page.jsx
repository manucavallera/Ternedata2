"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import businessApi from "@/api/bussines-api";
import { useRolEnCampo } from "@/hooks/useRolEnCampo";
import { ICONOS_INGREDIENTE, ingredientesACuerpo, mover } from "../tambo";

const mensaje = (err, porDefecto) => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : m || porDefecto;
};

const kg = (n) => (n == null ? "—" : Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 }));
const filaVacia = () => ({ nombre: "", kg: "", icono: "" });

// Formulario de un mixer: nombre, rodeo (solo al crear), cargas e ingredientes en orden de carga.
function FormMixer({ inicial, rodeos, onGuardado, onCerrar }) {
  const nuevo = !inicial.id_dieta;
  const [nombre, setNombre] = useState(inicial.nombre || "");
  const [idRodeo, setIdRodeo] = useState(inicial.id_rodeo ? String(inicial.id_rodeo) : "");
  const [cargas, setCargas] = useState(String(inicial.cargas || 1));
  const [filas, setFilas] = useState(
    inicial.ingredientes?.length
      ? inicial.ingredientes.map((i) => ({ nombre: i.nombre, kg: String(i.kg), icono: i.icono || "" }))
      : [filaVacia()]
  );
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cambiar = (i, campo, valor) => setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));

  const guardar = async (e) => {
    e.preventDefault();
    const { errores, ingredientes } = ingredientesACuerpo(filas);
    const nCargas = Number(cargas);
    if (nuevo && !idRodeo) errores.unshift("Elegí el rodeo");
    if (!Number.isInteger(nCargas) || nCargas < 1 || nCargas > 20) errores.push("Las cargas van de 1 a 20");
    if (errores.length) {
      setError(errores.join(". "));
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const cuerpo = { modo: "mezcla", nombre: nombre.trim() || undefined, cargas: nCargas, ingredientes };
      if (nuevo) await businessApi.post("/dietas/crear", { ...cuerpo, id_rodeo: Number(idRodeo) });
      else await businessApi.patch(`/dietas/${inicial.id_dieta}`, cuerpo);
      onGuardado();
    } catch (err) {
      setError(mensaje(err, "No se pudo guardar el mixer."));
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="mb-6 rounded-xl border-2 border-green-600 bg-white p-5 shadow-md">
      <h2 className="mb-4 text-lg font-bold text-gray-800">{nuevo ? "Nuevo mixer" : "Editar mixer"}</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold text-gray-700">
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Ración vacas en ordeñe"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Rodeo
          <select
            value={idRodeo}
            disabled={!nuevo}
            onChange={(e) => setIdRodeo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal disabled:bg-gray-100"
          >
            <option value="">Elegí un rodeo</option>
            {rodeos.map((r) => (
              <option key={r.id_rodeo} value={r.id_rodeo}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Cargas del mixer
          <input
            type="number"
            min="1"
            max="20"
            value={cargas}
            onChange={(e) => setCargas(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
      </div>

      <p className="mb-2 text-sm text-gray-600">Ingredientes en el orden en que se cargan, con los kg totales del día para todo el rodeo.</p>
      <ul className="space-y-2">
        {filas.map((f, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <select
              aria-label={`Ícono ingrediente ${i + 1}`}
              value={f.icono}
              onChange={(e) => cambiar(i, "icono", e.target.value)}
              className="rounded-lg border border-gray-300 px-1 py-2"
            >
              <option value="">—</option>
              {ICONOS_INGREDIENTE.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
            <input
              aria-label={`Ingrediente ${i + 1}`}
              value={f.nombre}
              onChange={(e) => cambiar(i, "nombre", e.target.value)}
              placeholder="Ej: Silo de maíz"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              aria-label={`Kg ingrediente ${i + 1}`}
              inputMode="decimal"
              value={f.kg}
              onChange={(e) => cambiar(i, "kg", e.target.value)}
              placeholder="kg"
              className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-right"
            />
            <div className="flex gap-1">
              <button type="button" aria-label="Subir" onClick={() => setFilas((fs) => mover(fs, i, -1))} className="rounded border px-2 py-1 text-sm">
                ↑
              </button>
              <button type="button" aria-label="Bajar" onClick={() => setFilas((fs) => mover(fs, i, 1))} className="rounded border px-2 py-1 text-sm">
                ↓
              </button>
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => setFilas((fs) => (fs.length > 1 ? fs.filter((_, j) => j !== i) : [filaVacia()]))}
                className="rounded border px-2 py-1 text-sm text-red-600"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setFilas((fs) => [...fs, filaVacia()])} className="mt-2 text-sm font-semibold text-green-700 underline">
        + Agregar ingrediente
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button disabled={guardando} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50">
          {guardando ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onCerrar} className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Tabla para el mixero: lo que mira en la balanza mientras carga.
function TarjetaMixer({ dieta, puedeEditar, onEditar, onBorrar }) {
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-md" data-mixer={dieta.nombre || dieta.id_dieta}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{dieta.nombre || "Mixer sin nombre"}</h2>
          <p className="text-sm text-gray-600">
            {dieta.rodeo?.nombre ?? "Rodeo"} · {dieta.cantidad_animales} cabezas · {dieta.cargas} {dieta.cargas === 1 ? "carga" : "cargas"} de{" "}
            {kg(dieta.kg_por_carga)} kg
          </p>
        </div>
        {puedeEditar && (
          <div className="flex gap-2">
            <button onClick={onEditar} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Editar
            </button>
            <button onClick={onBorrar} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">
              Borrar
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Ingrediente</th>
              <th className="px-3 py-2 text-right">Kg por cabeza</th>
              <th className="px-3 py-2 text-right">Kg del día</th>
              <th className="px-3 py-2 text-right">Kg por carga</th>
              <th className="px-3 py-2 text-right">Parcial balanza</th>
            </tr>
          </thead>
          <tbody>
            {dieta.ingredientes.map((i, n) => (
              <tr key={`${i.nombre}-${n}`} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <span className="mr-2 text-gray-400">{n + 1}.</span>
                  {i.icono && <span className="mr-1">{i.icono}</span>}
                  {i.nombre}
                </td>
                <td className="px-3 py-2 text-right">{kg(i.kg_por_cabeza)}</td>
                <td className="px-3 py-2 text-right">{kg(i.kg)}</td>
                <td className="px-3 py-2 text-right font-semibold">{kg(i.kg_por_carga)}</td>
                <td className="px-3 py-2 text-right font-bold text-green-700">{kg(i.parcial_carga)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{kg(dieta.kg_por_animal)}</td>
              <td className="px-3 py-2 text-right">{kg(dieta.total_rodeo)}</td>
              <td className="px-3 py-2 text-right">{kg(dieta.kg_por_carga)}</td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      {dieta.cantidad_animales === 0 && (
        <p className="mt-2 text-xs text-amber-700">El rodeo no tiene animales: los kg por cabeza no se pueden calcular.</p>
      )}
    </section>
  );
}

export default function Mixers() {
  const rol = useRolEnCampo();
  const establecimientoActual = useSelector((state) => state.auth.establecimientoActual);
  const puedeEditar = ["admin", "veterinario", "operario"].includes(rol);

  const [dietas, setDietas] = useState([]);
  const [rodeos, setRodeos] = useState([]);
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const pedido = useRef(0);
  const cargar = useCallback(async () => {
    const numero = ++pedido.current;
    setError("");
    try {
      const [ds, rs] = await Promise.all([
        businessApi.get("/dietas", { params: { modo: "mezcla" } }),
        businessApi.get("/rodeos/obtener-listado"),
      ]);
      if (numero !== pedido.current) return;
      setDietas(ds.data || []);
      setRodeos((rs.data || []).filter((r) => r.estado !== "inactivo"));
    } catch (err) {
      if (numero === pedido.current) setError(mensaje(err, "No se pudieron cargar los mixers."));
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establecimientoActual]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const borrar = async (d) => {
    if (!window.confirm(`¿Borrar el mixer ${d.nombre || ""}?`)) return;
    try {
      await businessApi.delete(`/dietas/${d.id_dieta}`);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo borrar."));
    }
  };

  if (cargando) return <div className="py-12 text-center text-gray-500">Cargando mixers...</div>;

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">🚜 Mixers</h1>
        <div className="flex gap-3">
          <Link href="/tambo" className="self-center text-sm font-semibold text-green-700 underline">
            Volver al rodeo
          </Link>
          {puedeEditar && !form && (
            <button onClick={() => setForm({})} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
              + Nuevo mixer
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {form && (
        <FormMixer
          key={form.id_dieta ?? "nuevo"}
          inicial={form}
          rodeos={rodeos}
          onCerrar={() => setForm(null)}
          onGuardado={() => {
            setForm(null);
            cargar();
          }}
        />
      )}

      {dietas.length === 0 && !form && (
        <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Todavía no hay mixers. Creá uno con los ingredientes de la ración y en cuántas cargas se reparte.
        </p>
      )}

      {dietas.map((d) => (
        <TarjetaMixer
          key={d.id_dieta}
          dieta={d}
          puedeEditar={puedeEditar}
          onEditar={() => {
            setForm(d);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onBorrar={() => borrar(d)}
        />
      ))}
    </div>
  );
}
