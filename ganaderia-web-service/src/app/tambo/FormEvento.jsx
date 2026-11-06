"use client";

import { useState } from "react";
import businessApi from "@/api/bussines-api";
import { TIPOS_EVENTO, caravanasAIds, hoyISO } from "./tambo";

// Carga un evento para una o varias vacas (día de tacto, de parches, de inseminación).
export default function FormEvento({ vacas, inicial, onListo, onCerrar }) {
  const [form, setForm] = useState({
    caravanas: inicial?.caravanas ?? "",
    tipo: inicial?.tipo ?? "inseminacion",
    fecha: hoyISO(),
    resultado: "preñada",
    dias_gestacion: "",
    toro: "",
    observacion: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const { ids, noEncontradas } = caravanasAIds(form.caravanas, vacas);

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    if (ids.length === 0) return setError("Escribí al menos una caravana del rodeo.");
    if (noEncontradas.length) return setError(`No están en el rodeo: ${noEncontradas.join(", ")}`);

    const base = { tipo: form.tipo, fecha: form.fecha };
    if (form.tipo === "tacto") {
      base.resultado = form.resultado;
      if (form.resultado === "preñada" && form.dias_gestacion) base.dias_gestacion = Number(form.dias_gestacion);
    }
    if (form.tipo === "inseminacion" && form.toro.trim()) base.toro = form.toro.trim();
    if (form.observacion.trim()) base.observacion = form.observacion.trim();

    setGuardando(true);
    const fallas = [];
    for (const id of ids) {
      try {
        await businessApi.post("/tambo/eventos", { ...base, id_madre: id });
      } catch (err) {
        const rp = vacas.find((v) => v.id_madre === id)?.rp_madre;
        const msg = err.response?.data?.message;
        fallas.push(`${rp}: ${Array.isArray(msg) ? msg.join(", ") : msg || "error"}`);
      }
    }
    setGuardando(false);
    if (fallas.length) {
      setError(`No se guardó para ${fallas.join(" · ")}`);
      if (fallas.length < ids.length) onListo?.(false);
      return;
    }
    onListo?.(true);
  };

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:border-green-500 focus:outline-none";

  return (
    <form onSubmit={guardar} className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Cargar evento</h2>
        <button type="button" onClick={onCerrar} className="text-sm text-gray-500 hover:text-gray-800">
          Cerrar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-600">
          Caravanas
          <input
            className={input}
            value={form.caravanas}
            onChange={cambiar("caravanas")}
            placeholder="Ej: 325, 328, 331"
            autoFocus
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            Una o varias, separadas por coma. {ids.length > 0 && `${ids.length} vaca${ids.length > 1 ? "s" : ""}.`}
          </span>
        </label>

        <label className="block text-sm font-semibold text-gray-600">
          Evento
          <select className={input} value={form.tipo} onChange={cambiar("tipo")}>
            {TIPOS_EVENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-gray-600">
          Fecha
          <input type="date" className={input} value={form.fecha} max={hoyISO()} onChange={cambiar("fecha")} required />
        </label>

        {form.tipo === "tacto" && (
          <label className="block text-sm font-semibold text-gray-600">
            Resultado
            <select className={input} value={form.resultado} onChange={cambiar("resultado")}>
              <option value="preñada">Preñada</option>
              <option value="vacia">Vacía</option>
            </select>
          </label>
        )}

        {form.tipo === "tacto" && form.resultado === "preñada" && (
          <label className="block text-sm font-semibold text-gray-600">
            Días de gestación (opcional)
            <input type="number" min={20} max={290} className={input} value={form.dias_gestacion} onChange={cambiar("dias_gestacion")} />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              Si la ecografía los da. Si no, el parto se calcula desde la inseminación.
            </span>
          </label>
        )}

        {form.tipo === "inseminacion" && (
          <label className="block text-sm font-semibold text-gray-600">
            Toro o pajuela (opcional)
            <input className={input} value={form.toro} onChange={cambiar("toro")} maxLength={100} />
          </label>
        )}

        <label className="block text-sm font-semibold text-gray-600 sm:col-span-2">
          Observación (opcional)
          <input className={input} value={form.observacion} onChange={cambiar("observacion")} maxLength={500} />
        </label>
      </div>

      {form.tipo === "parto" && (
        <p className="text-xs text-gray-500">
          Para cargar el ternero usá Ingresos. Si cargás el ternero con su madre, el parto se registra solo.
        </p>
      )}

      {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-lg bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : ids.length > 1 ? `Guardar para ${ids.length} vacas` : "Guardar"}
      </button>
    </form>
  );
}
