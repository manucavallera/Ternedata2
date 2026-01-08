"use client";

import { useAuthContext } from "@/context/authContext";
import { redirect } from "next/navigation";


function Layout({ children }) {
  const { isLoggedIn } = useAuthContext();

  if (!isLoggedIn) {
    redirect("/auth/login");
    return;
  }

  return <div>{children}</div>;
}

export default Layout;
