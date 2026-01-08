const initialState = {
  authPayload: {},
  status: "checking", // 'checking', 'not-authenticated', 'authenticated'
  userPayload: {},
  establecimientoActual: null, // NUEVO: para Admin cambiar establecimiento
};

export default initialState;
