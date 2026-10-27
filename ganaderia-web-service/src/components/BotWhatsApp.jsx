"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/auth";

// Número del bot de WhatsApp. Se puede cambiar al buildear.
const BOT_NUMERO = (process.env.NEXT_PUBLIC_WHATSAPP_BOT || "5493435333842").replace(/\D/g, "");
const BOT_LINK = `https://wa.me/${BOT_NUMERO}?text=${encodeURIComponent("hola")}`;

const estilos = {
  oscuro: {
    caja: "border-emerald-700/50 bg-emerald-900/30 text-slate-200",
    texto: "text-slate-300",
    link: "text-emerald-300 hover:text-emerald-200",
  },
  claro: {
    caja: "border-emerald-200 bg-emerald-50 text-gray-800",
    texto: "text-gray-600",
    link: "text-emerald-700 hover:text-emerald-800",
  },
};

/**
 * Tarjeta para abrir el chat con el bot.
 * Si el usuario no tiene teléfono cargado, le pide cargarlo (sin teléfono el bot no lo reconoce).
 * `telefono`: si se pasa, no consulta el perfil (lo usa la página de perfil).
 */
export default function BotWhatsApp({ telefono, variante = "claro" }) {
  const { getProfileHook } = useAuthSession();
  const [tel, setTel] = useState(telefono);
  const [cargando, setCargando] = useState(telefono === undefined);

  useEffect(() => {
    if (telefono !== undefined) {
      setTel(telefono);
      setCargando(false);
      return;
    }
    let activo = true;
    getProfileHook().then((res) => {
      if (!activo) return;
      setTel(res.success ? res.data.telefono || "" : "");
      setCargando(false);
    });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefono]);

  if (cargando) return null;
  const e = estilos[variante] || estilos.claro;
  const tieneTelefono = Boolean(tel && tel.replace(/\D/g, ""));
  // En el perfil el formulario está arriba: no hace falta mandar al perfil.
  const enPerfil = telefono !== undefined;

  return (
    <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${e.caja}`}>
      <div className='min-w-0'>
        <p className='font-semibold text-sm sm:text-base'>Cargá datos por WhatsApp</p>
        {tieneTelefono ? (
          <p className={`text-xs sm:text-sm mt-0.5 ${e.texto}`}>
            Escribile o mandale un audio al bot desde el celular <strong>{tel}</strong>. Probá con &quot;nació
            ternero RP 100 macho 35 kilos&quot;.
          </p>
        ) : enPerfil ? (
          <p className={`text-xs sm:text-sm mt-0.5 ${e.texto}`}>
            Para que el bot te reconozca, cargá tu celular arriba y guardá los cambios.
          </p>
        ) : (
          <p className={`text-xs sm:text-sm mt-0.5 ${e.texto}`}>
            Para que el bot te reconozca, primero cargá tu número de celular en el{" "}
            <Link href='/perfil' className={`font-semibold underline ${e.link}`}>
              perfil
            </Link>
            .
          </p>
        )}
      </div>
      {tieneTelefono ? (
        <a
          href={BOT_LINK}
          target='_blank'
          rel='noopener noreferrer'
          className='shrink-0 inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap'
        >
          Abrir el bot en WhatsApp
        </a>
      ) : enPerfil ? null : (
        <Link
          href='/perfil'
          className='shrink-0 inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap'
        >
          Cargar mi celular
        </Link>
      )}
    </div>
  );
}
