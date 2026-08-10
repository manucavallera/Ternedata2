export const filterGlobalUsers = (
  users,
  { role = "todos", status = "todos" } = {},
) =>
  users.filter(
    (user) =>
      (role === "todos" || user.rol === role) &&
      (status === "todos" || user.estado === status),
  );

export const getAssignedEstablishments = (user) => {
  const assigned = Array.isArray(user.establecimientosAsignados)
    ? user.establecimientosAsignados
    : [];

  if (assigned.length > 0) {
    return assigned.map(({ id, nombre }) => ({
      id,
      nombre: nombre || `Establecimiento #${id}`,
    }));
  }

  if (Number.isInteger(user.id_establecimiento)) {
    return [
      {
        id: user.id_establecimiento,
        nombre:
          user.establecimiento ||
          `Establecimiento #${user.id_establecimiento}`,
      },
    ];
  }

  return [];
};
