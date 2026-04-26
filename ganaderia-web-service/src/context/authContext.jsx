"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

const AUTH_TOKENS_KEY = "NEXT_JS_AUTH";

export const AuthContext = createContext({
  login: (authTokens) => {},
  logout: () => {},
  isLoggedIn: false,
  authTokens: null,
  isLoading: true, // Nuevo: para manejar el estado de carga
});

export default function AuthContextProvider({ children }) {
  const [authTokens, setAuthTokens] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Nuevo estado

  // 🔥 SOLUCIÓN: Mover la lógica de localStorage a useEffect
  useEffect(() => {
    let initialAuthTokens = null;

    try {
      const authTokensInLocalStorage =
        window.localStorage.getItem(AUTH_TOKENS_KEY);

      if (authTokensInLocalStorage && authTokensInLocalStorage !== "undefined") {
        // Verificar que el token no esté expirado
        try {
          const payload = JSON.parse(atob(authTokensInLocalStorage.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            window.localStorage.clear();
            initialAuthTokens = null;
          } else {
            initialAuthTokens = authTokensInLocalStorage;
          }
        } catch {
          initialAuthTokens = authTokensInLocalStorage;
        }
      }
    } catch (error) {
      console.error("Error parsing auth tokens:", error);
      initialAuthTokens = null;
    }

    setAuthTokens(initialAuthTokens);
    setIsLoading(false); // Ya terminamos de cargar
  }, []); // Solo se ejecuta una vez al montar el componente

  const login = useCallback(function (authTokens) {
    // ✅ Verificar que estamos en el navegador
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_TOKENS_KEY, authTokens);
    }
    setAuthTokens(authTokens);
  }, []);

  const logout = useCallback(function () {
    // ✅ Verificar que estamos en el navegador
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_TOKENS_KEY);
    }
    setAuthTokens(null);
  }, []);

  const value = useMemo(
    () => ({
      login,
      logout,
      authTokens,
      isLoggedIn: authTokens !== null,
      isLoading, // Exponemos el estado de loading
    }),
    [authTokens, login, logout, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
