// Roles en la web. Hay dos niveles:
// - Rol global (userPayload.rol): 'admin' lo recibe cualquiera que se registra;
//   'super_admin' administra toda la plataforma.
// - Rol en cada campo (mi_rol_en_campo de GET /establecimientos): 'dueno', 'veterinario'
//   u 'operario'. Es el que vale para los permisos dentro de ese campo.
// Misma regla que RolEstablecimientoService del backend (que es quien decide).

// Puede elegir campo con el selector y mandar ?id_establecimiento=.
export const esAdminGlobal = (user) =>
  ["admin", "super_admin"].includes(user?.rol);

const NIVEL = { operario: 1, veterinario: 2, admin: 3 };
const normalizar = (rol) => (["veterinario", "operario"].includes(rol) ? rol : null);

// Rol en un campo: 'admin' | 'veterinario' | 'operario' | null.
// misEstablecimientos viene de GET /establecimientos (store auth), con mi_rol_en_campo.
export const rolEnCampo = (user, idCampo, misEstablecimientos = []) => {
  if (!user) return null;
  if (user.rol === "super_admin") return "admin";
  const id = Number(idCampo ?? user.id_establecimiento);
  const rolFilaCrudo = (misEstablecimientos || []).find(
    (e) => Number(e.id_establecimiento) === id
  )?.mi_rol_en_campo;
  if (rolFilaCrudo === "dueno") return "admin";
  const rolFila = normalizar(rolFilaCrudo);
  if (user.rol === "admin") return rolFila || "admin";
  const rolGlobal = normalizar(user.rol);
  if (!rolFila) return rolGlobal;
  if (!rolGlobal) return rolFila;
  return NIVEL[rolFila] >= NIVEL[rolGlobal] ? rolFila : rolGlobal;
};

export const esAdminDelCampo = (user, idCampo, misEstablecimientos) =>
  rolEnCampo(user, idCampo, misEstablecimientos) === "admin";

// "?id_establecimiento=N" para quien puede elegir campo, si eligió uno.
export const queryCampo = (user, establecimientoActual) =>
  esAdminGlobal(user) && establecimientoActual
    ? `?id_establecimiento=${establecimientoActual}`
    : "";
