"use client";

import { useAuthContext } from "@/context/authContext";
import { redirect } from "next/navigation";
import AdminPanel from "@/components/secciones/admin/AdminPanel";

export default function PanelAdminPage() {
  const { isLoggedIn, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    redirect("/auth/login");
    return null;
  }

  return <AdminPanel />;
}
