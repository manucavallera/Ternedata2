"use client";

import { useEffect } from "react";
import { useAuthContext } from "@/context/authContext";

export default function Page() {
  const { logout } = useAuthContext();
  useEffect(() => {
    logout();
  });

  return null;
}