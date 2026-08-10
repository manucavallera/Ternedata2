export const saveRefreshedSession = ({ token, user }, storage) => {
  if (!token || !user?.id) {
    throw new Error("Respuesta de refresh inválida");
  }

  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    rol: user.rol,
    estado: user.estado,
    telefono: user.telefono,
    id_establecimiento: user.id_establecimiento,
  };

  storage.setItem("token", token);
  storage.setItem("NEXT_JS_AUTH", token);
  storage.setItem("userSelected", JSON.stringify(userPayload));
  return userPayload;
};
