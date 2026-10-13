export function esContextoForrajeria(establecimiento) {
  return establecimiento?.tipo_organizacion === "forrajeria";
}

export function obtenerRutaInicio(establecimiento) {
  return esContextoForrajeria(establecimiento)
    ? "/forrajeria"
    : "/admin/dashboard";
}
