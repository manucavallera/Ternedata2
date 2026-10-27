"use client";

import React from "react";
import { usePathname } from "next/navigation";

const Footer = () => {
  const pathname = usePathname();
  // La home tiene su propio pie (landing de venta).
  if (pathname === "/") return null;

  return (
    <div>
      <footer className='bg-green-400 p-3 sm:p-4 md:p-6 text-center text-white text-xs sm:text-sm md:text-base'>
        <p>
          &copy; {new Date().getFullYear()} Sistema de Gestión TerneData. Todos los derechos
          reservados.
        </p>
      </footer>
    </div>
  );
};

export default Footer;
