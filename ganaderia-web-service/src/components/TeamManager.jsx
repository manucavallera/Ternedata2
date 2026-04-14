import React, { useEffect, useState } from "react";
import { equipoService } from "@/api/equipoRepo";

const ROL_COLORS = {
  dueno: "bg-purple-100 text-purple-800",
  veterinario: "bg-green-100 text-green-800",
  operario: "bg-blue-100 text-blue-800",
};

export const TeamManager = ({ establecimientoId }) => {
  const [miembros, setMiembros] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("equipo"); // "equipo" | "pendientes"

  // Modal de invitación
  const [modalOpen, setModalOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRol, setInvRol] = useState("operario");
  const [invLoading, setInvLoading] = useState(false);
  const [invResult, setInvResult] = useState(null); // { link, emailEnviado }

  useEffect(() => {
    if (establecimientoId) {
      cargarTodo();
    }
  }, [establecimientoId]);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [equipo, invPendientes] = await Promise.all([
        equipoService.getEquipo(establecimientoId),
        equipoService.getPendientes(establecimientoId),
      ]);
      setMiembros(equipo);
      setPendientes(invPendientes);
    } catch (error) {
      console.error("Error cargando equipo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (userId, nombre) => {
    if (!confirm(`¿Seguro que querés sacar a ${nombre} del equipo?`)) return;
    try {
      await equipoService.eliminarMiembro(establecimientoId, userId);
      setMiembros((prev) => prev.filter((m) => m.userId !== userId));
    } catch (error) {
      alert("No se pudo eliminar al usuario.");
    }
  };

  const handleRevocar = async (invId) => {
    if (!confirm("¿Revocar esta invitación?")) return;
    try {
      await equipoService.revocarInvitacion(invId);
      setPendientes((prev) => prev.filter((i) => i.id !== invId));
    } catch (error) {
      alert("No se pudo revocar la invitación.");
    }
  };

  const handleInvitar = async (e) => {
    e.preventDefault();
    setInvLoading(true);
    setInvResult(null);
    try {
      const data = await equipoService.invitarConEmail(
        establecimientoId,
        invEmail || undefined,
        invRol
      );
      setInvResult(data);
      // Refrescar pendientes
      const nuevasPendientes = await equipoService.getPendientes(establecimientoId);
      setPendientes(nuevasPendientes);
    } catch (error) {
      alert("Error generando la invitación.");
    } finally {
      setInvLoading(false);
    }
  };

  const copiarLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copiado al portapapeles.");
    } catch {
      alert(`Link: ${link}`);
    }
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setInvEmail("");
    setInvRol("operario");
    setInvResult(null);
  };

  const expirado = (fecha) => new Date() > new Date(fecha);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Equipo de Trabajo 🚜</h3>
          <p className="text-sm text-gray-500">Gestiona quién puede acceder a este campo.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={cargarTodo}
            disabled={loading}
            className="flex items-center gap-1 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Actualizar lista"
          >
            🔄
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm text-sm"
          >
            ✉️ Invitar persona
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab("equipo")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === "equipo"
              ? "bg-white border border-b-white border-gray-200 text-indigo-700 -mb-px"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Equipo ({miembros.length})
        </button>
        <button
          onClick={async () => {
            setTab("pendientes");
            // Refrescar al abrir el tab para no mostrar datos viejos
            try {
              const inv = await equipoService.getPendientes(establecimientoId);
              setPendientes(inv);
            } catch {}
          }}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === "pendientes"
              ? "bg-white border border-b-white border-gray-200 text-indigo-700 -mb-px"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pendientes {pendientes.length > 0 && <span className="ml-1 bg-yellow-400 text-yellow-900 text-xs rounded-full px-1.5">{pendientes.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : tab === "equipo" ? (
        /* TABLA EQUIPO */
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm font-semibold">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Rol</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {miembros.map((m) => (
                <tr key={m.userId} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{m.nombre}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROL_COLORS[m.rol] || "bg-gray-100 text-gray-700"}`}>
                      {m.rol?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {m.rol !== "dueno" && (
                      <button
                        onClick={() => handleEliminar(m.userId, m.nombre)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition-colors text-sm"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {miembros.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-6 text-center text-gray-400 italic">
                    Nadie en el equipo todavía. ¡Invitá a alguien!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* TABLA PENDIENTES */
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm font-semibold">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Expira</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendientes.map((inv) => (
                <tr key={inv.id} className={`hover:bg-gray-50 ${expirado(inv.expiracion) ? "opacity-50" : ""}`}>
                  <td className="p-3 text-sm text-gray-700">{inv.email || <span className="text-gray-400 italic">Sin email</span>}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROL_COLORS[inv.rol] || "bg-gray-100 text-gray-700"}`}>
                      {inv.rol?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {expirado(inv.expiracion) ? (
                      <span className="text-red-500 font-medium">Expirada</span>
                    ) : (
                      new Date(inv.expiracion).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleRevocar(inv.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition-colors text-sm"
                    >
                      Revocar
                    </button>
                  </td>
                </tr>
              ))}
              {pendientes.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-gray-400 italic">
                    No hay invitaciones pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL INVITACIÓN */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-bold text-gray-800 mb-1">Invitar persona</h4>
            <p className="text-sm text-gray-500 mb-4">
              Ingresá el email para enviar la invitación por correo, o dejalo vacío para copiar el link.
            </p>

            {!invResult ? (
              <form onSubmit={handleInvitar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={invEmail}
                    onChange={(e) => setInvEmail(e.target.value)}
                    placeholder="persona@ejemplo.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={invRol}
                    onChange={(e) => setInvRol(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="operario">👷 Operario</option>
                    <option value="veterinario">🩺 Veterinario</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={invLoading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {invLoading ? "Generando..." : invEmail ? "Enviar invitación" : "Generar link"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {invResult.emailEnviado ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                    ✅ Email enviado a <strong>{invResult.emailEnviado}</strong>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    No se ingresó email. Copiá el link y envialo manualmente:
                  </div>
                )}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 break-all">
                  {invResult.link}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => copiarLink(invResult.link)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    📋 Copiar link
                  </button>
                  <button
                    onClick={cerrarModal}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                  >
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
