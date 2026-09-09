"use client";

import { useEffect, useMemo, useState } from "react";
import { useBussinesMicroservicio } from "@/hooks/bussines";

const today = () => new Date().toISOString().slice(0, 10);
const dateKey = (value) => (value ? String(value).slice(0, 10) : "");
const monthKey = (value) => String(value).slice(0, 7);

const daysOfMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  return [...Array(offset).fill(null), ...Array.from({ length: total }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)];
};

const moveMonth = (month, delta) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};

export default function SeguimientoTernero({ ternero, onClose, onSaved }) {
  const {
    obtenerPesajesSeguimientoHook, crearPesajeSeguimientoHook,
    actualizarPesajeSeguimientoHook, eliminarPesajeSeguimientoHook,
    obtenerCalostradosSeguimientoHook, crearCalostradoSeguimientoHook,
    actualizarCalostradoSeguimientoHook, eliminarCalostradoSeguimientoHook,
  } = useBussinesMicroservicio();
  const [pesajes, setPesajes] = useState([]);
  const [calostrados, setCalostrados] = useState([]);
  const [hitos, setHitos] = useState({});
  const [selectedDate, setSelectedDate] = useState(today());
  const [month, setMonth] = useState(monthKey(today()));
  const [filter, setFilter] = useState("Todos");
  const [type, setType] = useState("peso");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [peso, setPeso] = useState({ fecha: today(), peso: "", observaciones: "" });
  const [calostro, setCalostro] = useState({ fecha: today(), hora: "08:00", metodo: "mamadera", litros: "", grado_brix: "", observaciones: "" });

  const notify = (text, failed = false) => { setMessage(text); setError(failed); window.setTimeout(() => setMessage(""), 4000); };

  const load = async () => {
    setLoading(true);
    const [weights, colostrum] = await Promise.all([
      obtenerPesajesSeguimientoHook(ternero.id_ternero),
      obtenerCalostradosSeguimientoHook(ternero.id_ternero),
    ]);
    if (weights?.status >= 200 && weights.status < 300) {
      setPesajes(weights.data?.pesajes || []); setHitos(weights.data?.hitos || {});
    } else notify(weights?.message || "No se pudo cargar el seguimiento", true);
    if (colostrum?.status >= 200 && colostrum.status < 300) setCalostrados(colostrum.data?.calostrados || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ternero.id_ternero]);

  const markers = useMemo(() => {
    const result = {};
    pesajes.forEach((item) => { result[dateKey(item.fecha)] = { ...result[dateKey(item.fecha)], peso: true }; });
    calostrados.forEach((item) => { result[dateKey(item.fecha_hora)] = { ...result[dateKey(item.fecha_hora)], calostro: true }; });
    return result;
  }, [calostrados, pesajes]);

  const records = useMemo(() => [
    ...(filter !== "Calostrado" ? pesajes.filter((item) => dateKey(item.fecha) === selectedDate).map((item) => ({ ...item, type: "peso" })) : []),
    ...(filter !== "Pesos" ? calostrados.filter((item) => dateKey(item.fecha_hora) === selectedDate).map((item) => ({ ...item, type: "calostro" })) : []),
  ], [calostrados, filter, pesajes, selectedDate]);

  const reset = (date = selectedDate) => {
    setEditing(null); setPeso({ fecha: date, peso: "", observaciones: "" });
    setCalostro({ fecha: date, hora: "08:00", metodo: "mamadera", litros: "", grado_brix: "", observaciones: "" });
  };

  const savePeso = async (event) => {
    event.preventDefault();
    if (!peso.fecha || !peso.peso || !Number.isFinite(Number(peso.peso)) || Number(peso.peso) <= 0) return notify("Ingresá fecha y peso válido", true);
    setSaving(true);
    const payload = { fecha: peso.fecha, peso: Number(peso.peso), observaciones: peso.observaciones.trim() || undefined };
    const result = editing?.type === "peso" ? await actualizarPesajeSeguimientoHook(ternero.id_ternero, editing.id_pesaje, payload) : await crearPesajeSeguimientoHook(ternero.id_ternero, payload);
    setSaving(false);
    if (result?.status >= 200 && result.status < 300) { notify(editing ? "Pesaje actualizado" : "Pesaje guardado"); setSelectedDate(peso.fecha); setMonth(monthKey(peso.fecha)); reset(peso.fecha); await load(); onSaved?.(); }
    else notify(result?.message || "No se pudo guardar el pesaje", true);
  };

  const saveCalostro = async (event) => {
    event.preventDefault();
    const litros = Number(calostro.litros);
    const brix = calostro.grado_brix === "" ? undefined : Number(calostro.grado_brix);
    if (!calostro.fecha || !calostro.metodo || !Number.isFinite(litros) || litros <= 0 || (brix !== undefined && (!Number.isFinite(brix) || brix < 0 || brix > 50))) return notify("Completá fecha, método, litros y Brix válido", true);
    setSaving(true);
    const payload = { fecha_hora: `${calostro.fecha}T${calostro.hora || "08:00"}:00`, metodo: calostro.metodo, litros, grado_brix: brix, observaciones: calostro.observaciones.trim() || undefined };
    const result = editing?.type === "calostro" ? await actualizarCalostradoSeguimientoHook(ternero.id_ternero, editing.id_calostrado, payload) : await crearCalostradoSeguimientoHook(ternero.id_ternero, payload);
    setSaving(false);
    if (result?.status >= 200 && result.status < 300) { notify(editing ? "Calostrado actualizado" : "Calostrado guardado"); setSelectedDate(calostro.fecha); setMonth(monthKey(calostro.fecha)); reset(calostro.fecha); await load(); await onSaved?.(); }
    else notify(result?.message || "No se pudo guardar el calostrado", true);
  };

  const edit = (item) => {
    setEditing(item); setType(item.type);
    if (item.type === "peso") setPeso({ fecha: dateKey(item.fecha), peso: String(item.peso), observaciones: item.observaciones || "" });
    else setCalostro({ fecha: dateKey(item.fecha_hora), hora: String(item.fecha_hora).slice(11, 16) || "08:00", metodo: item.metodo, litros: String(item.litros), grado_brix: item.grado_brix == null ? "" : String(item.grado_brix), observaciones: item.observaciones || "" });
  };

  const remove = async (item) => {
    if (!window.confirm("¿Eliminar este registro? No se puede deshacer.")) return;
    const result = item.type === "peso" ? await eliminarPesajeSeguimientoHook(ternero.id_ternero, item.id_pesaje) : await eliminarCalostradoSeguimientoHook(ternero.id_ternero, item.id_calostrado);
    if (result?.status >= 200 && result.status < 300) { notify("Registro eliminado"); await load(); await onSaved?.(); } else notify(result?.message || "No se pudo eliminar", true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-4 text-slate-100 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-400">Seguimiento del ternero</p><h2 className="text-2xl font-black text-white">RP {ternero.rp_ternero}</h2></div><button onClick={onClose} className="rounded-lg bg-slate-700 px-3 py-2 text-xl hover:bg-slate-600">✕</button></div>
        {message && <div className={`mb-4 rounded-lg p-3 text-center font-bold ${error ? "bg-red-700" : "bg-emerald-700"}`}>{message}</div>}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <section className="rounded-xl bg-slate-800 p-4"><div className="mb-3 flex items-center justify-between"><button onClick={() => setMonth(moveMonth(month, -1))} className="px-3 text-2xl text-amber-400">‹</button><h3 className="font-black capitalize">{monthLabel(month)}</h3><button onClick={() => setMonth(moveMonth(month, 1))} className="px-3 text-2xl text-amber-400">›</button></div><div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400">{["L", "M", "X", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{daysOfMonth(month).map((date, index) => <button key={date || `blank-${index}`} disabled={!date} onClick={() => { setSelectedDate(date); reset(date); }} className={`relative h-10 rounded-lg text-sm font-bold ${date === selectedDate ? "bg-emerald-600 text-white" : "text-slate-200 hover:bg-slate-700"}`}>{date ? Number(date.slice(-2)) : ""}{date && markers[date] && <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">{markers[date].peso && <i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />}{markers[date].calostro && <i className="h-1.5 w-1.5 rounded-full bg-amber-300" />}</span>}</button>)}</div><p className="mt-3 text-xs text-slate-400">● verde peso · ● amarillo calostrado</p></section>
            <section className="rounded-xl bg-slate-800 p-4"><h3 className="mb-3 font-black">Hitos de crecimiento</h3><div className="grid grid-cols-5 gap-1 text-center">{[["Nacer", ternero.peso_nacer, null], ["15d", hitos["15d"]?.peso, hitos["15d"]?.fecha], ["30d", hitos["30d"]?.peso, hitos["30d"]?.fecha], ["45d", hitos["45d"]?.peso, hitos["45d"]?.fecha], ["Largado", ternero.peso_largado, null]].map(([label, value, date]) => <div key={label}><p className="font-black text-emerald-400">{value == null || value === 0 ? "—" : `${value} kg`}</p><p className="text-xs text-slate-400">{label}</p>{date && <p className="text-[10px] text-slate-500">{dateKey(date)}</p>}</div>)}</div></section>
          </div>
          <div className="space-y-4">
            <section className="rounded-xl bg-slate-800 p-4"><div className="mb-3 flex gap-2"><button onClick={() => { setType("peso"); setEditing(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${type === "peso" ? "bg-emerald-600" : "bg-slate-700"}`}>⚖️ Peso</button><button onClick={() => { setType("calostro"); setEditing(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${type === "calostro" ? "bg-emerald-600" : "bg-slate-700"}`}>🍼 Calostrado</button></div>{type === "peso" ? <form onSubmit={savePeso} className="space-y-2"><label className="block text-xs font-bold text-slate-400">Fecha *<input type="date" value={peso.fecha} onChange={(e) => setPeso({ ...peso, fecha: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white" required /></label><label className="block text-xs font-bold text-slate-400">Peso (kg) *<input type="number" min="0.01" step="0.01" value={peso.peso} onChange={(e) => setPeso({ ...peso, peso: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white" required /></label><label className="block text-xs font-bold text-slate-400">Observaciones<input value={peso.observaciones} onChange={(e) => setPeso({ ...peso, observaciones: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white" /></label><button disabled={saving} className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-black hover:bg-emerald-500 disabled:opacity-50">{saving ? "Guardando..." : editing ? "Actualizar pesaje" : "Guardar pesaje"}</button></form> : <form onSubmit={saveCalostro} className="space-y-2"><div className="grid grid-cols-2 gap-2"><label className="block text-xs font-bold text-slate-400">Fecha *<input type="date" value={calostro.fecha} onChange={(e) => setCalostro({ ...calostro, fecha: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white" required /></label><label className="block text-xs font-bold text-slate-400">Hora<input type="time" value={calostro.hora} onChange={(e) => setCalostro({ ...calostro, hora: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white" /></label></div><label className="block text-xs font-bold text-slate-400">Método *<select value={calostro.metodo} onChange={(e) => setCalostro({ ...calostro, metodo: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white"><option value="mamadera">🍼 Mamadera</option><option value="sonda">🩺 Sonda</option></select></label><div className="grid grid-cols-2 gap-2"><label className="block text-xs font-bold text-slate-400">Litros *<input type="number" min="0.01" step="0.01" value={calostro.litros} onChange={(e) => setCalostro({ ...calostro, litros: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white" required /></label><label className="block text-xs font-bold text-slate-400">Brix<input type="number" min="0" max="50" step="0.01" value={calostro.grado_brix} onChange={(e) => setCalostro({ ...calostro, grado_brix: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white" /></label></div><label className="block text-xs font-bold text-slate-400">Observaciones<input value={calostro.observaciones} onChange={(e) => setCalostro({ ...calostro, observaciones: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white" /></label><button disabled={saving} className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-black hover:bg-emerald-500 disabled:opacity-50">{saving ? "Guardando..." : editing ? "Actualizar calostrado" : "Guardar calostrado"}</button></form>}</section>
            <section className="rounded-xl bg-slate-800 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Registros del {selectedDate}</h3><button onClick={() => reset()} className="text-xs font-bold text-emerald-300">Limpiar</button></div><div className="mb-3 flex gap-2">{["Todos", "Pesos", "Calostrado"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-3 py-1 text-xs font-bold ${filter === item ? "bg-emerald-600" : "bg-slate-700 text-slate-300"}`}>{item}</button>)}</div>{loading ? <p className="py-6 text-center text-slate-400">Cargando...</p> : records.length === 0 ? <p className="py-6 text-center text-slate-400">No hay registros para esta fecha.</p> : <div className="divide-y divide-slate-700">{records.map((item) => <div key={`${item.type}-${item.id_pesaje || item.id_calostrado}`} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="font-black">{item.type === "peso" ? `⚖️ ${item.peso} kg` : `${item.metodo === "mamadera" ? "🍼" : "🩺"} ${item.litros} L · ${String(item.fecha_hora).slice(11, 16)}`}</p><p className="text-xs text-slate-400">{item.type === "peso" ? `${item.ganancia_desde_anterior ?? "—"} kg desde anterior · ${item.aumento_diario_promedio ?? "—"} kg/día` : `Brix: ${item.grado_brix ?? "—"}`}</p>{item.observaciones && <p className="text-xs text-slate-500">{item.observaciones}</p>}</div><button onClick={() => edit(item)} title="Editar">✏️</button><button onClick={() => remove(item)} title="Eliminar">🗑️</button></div>)}</div>}</section>
          </div>
        </div>
      </div>
    </div>
  );
}
