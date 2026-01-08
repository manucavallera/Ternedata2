// src/components/ClientOnly.jsx
"use client";

import { useEffect, useState } from "react";

const ClientOnly = ({ children, fallback = null }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Durante SSR y antes del primer render en cliente, mostrar fallback
  if (!hasMounted) {
    return fallback;
  }

  // Solo después de montar en el cliente, mostrar el contenido real
  return children;
};

export default ClientOnly;
