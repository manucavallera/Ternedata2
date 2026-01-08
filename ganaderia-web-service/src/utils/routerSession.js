"use client";

import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useAuthContext } from "@/context/authContext";
import sessionSuccessMethod from "./sessionSuccess";

export const useRouterSession = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { login, authTokens, isLoading } = useAuthContext();

  // Helper para obtener token de localStorage de manera segura
  const getTokenFromStorage = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const sessionHome = () => {
    // Si aún está cargando, no hacer nada
    if (isLoading) return;

    const tokenString = getTokenFromStorage();

    if (!tokenString && !authTokens) {
      return router.push("/");
    } else {
      const finalToken = tokenString || authTokens;
      sessionSuccessMethod(dispatch);
      login(finalToken);
      return router.push("/admin/dashboard");
    }
  };

  const sessionRegister = (status) => {
    // Si aún está cargando, no hacer nada
    if (isLoading) return;

    const tokenString = getTokenFromStorage();

    if (tokenString || authTokens) {
      const finalToken = tokenString || authTokens;
      sessionSuccessMethod(dispatch);
      login(finalToken);
      return router.push("/admin/dashboard");
    }

    if (status === true) {
      return router.push("/auth/login");
    } else {
      return router.push("/auth/register");
    }
  };

  const sessionLogin = (status) => {
    // Si aún está cargando, no hacer nada
    if (isLoading) return;

    const tokenString = getTokenFromStorage();

    if (status === true) {
      return router.push("/admin/dashboard");
    }

    if (!tokenString && !authTokens) {
      return router.push("/auth/login");
    } else {
      const finalToken = tokenString || authTokens;
      sessionSuccessMethod(dispatch);
      login(finalToken);
      return router.push("/admin/dashboard");
    }
  };

  return {
    sessionHome,
    sessionRegister,
    sessionLogin,
    isLoading, // Para saber si aún está cargando
  };
};
