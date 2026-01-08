const verifySession = (authPayload, status) => {
  // ✅ Verificar que estamos en el navegador
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }

  const tokenString = localStorage.getItem("token");

  if (authPayload && status === "authenticated" && tokenString != null) {
    return true;
  } else {
    return false;
  }
};

export default verifySession;
