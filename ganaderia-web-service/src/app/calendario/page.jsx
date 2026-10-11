"use client";

import dynamic from "next/dynamic";

// Usa la fecha de hoy al renderizar: sin SSR para que el HTML prerenderizado no quede con otra fecha.
const CalendarioSeccion = dynamic(
  () => import("@/components/secciones/calendario/Calendario-seccion"),
  { ssr: false }
);

export default function CalendarioPage() {
  return <CalendarioSeccion />;
}
