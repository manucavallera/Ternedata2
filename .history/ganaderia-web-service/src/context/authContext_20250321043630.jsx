"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const AUTH_TOKENS_KEY = "NEXT_JS_AUTH";

export const AuthContext = createContext({
  login: (authTokens) => {},
  logout: () => {},
  isLoggedIn: false,
  authTokens: null,
});

export default function AuthContextProvider({ children }) {
  let initialAuthTokens = null;

  try {
    const authTokensInLocalStorage = window.localStorage.getItem(AUTH_TOKENS_KEY);
    // Validamos que no sea null, undefined ni el string "undefined"
    if (authTokensInLocalStorage && authTokensInLocalStorage !== "undefined") {
      initialAuthTokens = authTokensInLocalStorage
    }
  } catch (error) {
    console.error("Error parsing auth tokens:", error);
    initialAuthTokens = null;
  }

  const [authTokens, setAuthTokens] = useState(initialAuthTokens);

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
    }),
    [authTokens, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}


