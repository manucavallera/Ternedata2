const initialState = {
  authPayload: {},
  status: "checking", // 'checking', 'not-authenticated', 'authenticated'
  userPayload: {},
  establecimientoActual: null, // NUEVO: para Admin cambiar establecimiento
  // Campos del usuario con su rol en cada uno (mi_rol_en_campo), de GET /establecimientos
  misEstablecimientos: [],
};

export default initialState;
