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
      // Ahora SÍ podemos acceder a window.localStorage porque estamos en el cliente
      const authTokensInLocalStorage =
        window.localStorage.getItem(AUTH_TOKENS_KEY);

      // Validamos que no sea null, undefined ni el string "undefined"
      if (
        authTokensInLocalStorage &&
        authTokensInLocalStorage !== "undefined"
      ) {
        initialAuthTokens = authTokensInLocalStorage;
      }
    } catch (error) {
      console.error("Error parsing auth tokens:", error);
      initialAuthTokens = null;
    }

    setAuthTokens(initialAuthTokens);
    setIsLoading(false); // Ya terminamos de cargar
  }, []); // Solo se ejecuta una vez al montar el componente

  const login = useCallback(function (authTokens) {
    window.localStorage.setItem(AUTH_TOKENS_KEY, authTokens);
    setAuthTokens(authTokens);
  }, []);

  const logout = useCallback(function () {
    window.localStorage.removeItem(AUTH_TOKENS_KEY);
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
