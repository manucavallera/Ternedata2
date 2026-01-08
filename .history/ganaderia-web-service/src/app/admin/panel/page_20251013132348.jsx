"use client";

import { useEffect } from "react";
import { useAuthContext } from "@/context/authContext";
import { redirect } from "next/navigation";
import AdminPanel from "@/components/secciones/admin/AdminPanel";

export default function AdminPanelPage() {
  const { isLoggedIn, isLoading } = useAuthContext();

  // Verificar autenticación sin redirigir al dashboard
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      redirect("/auth/login");
    }
  }, [isLoggedIn, isLoading]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return <AdminPanel />;
}
