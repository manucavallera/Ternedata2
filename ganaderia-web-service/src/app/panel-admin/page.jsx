"use client";

import { useAuthContext } from "@/context/authContext";
import { useSelector } from "react-redux";
import { redirect } from "next/navigation";
import AdminPanel from "@/components/secciones/admin/AdminPanel";

export default function PanelAdminPage() {
  const { isLoggedIn, isLoading } = useAuthContext();
  const { userPayload } = useSelector((state) => state.auth);

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

  if (userPayload && userPayload.rol !== "admin") {
    redirect("/admin/dashboard");
    return null;
  }

  return <AdminPanel />;
}
