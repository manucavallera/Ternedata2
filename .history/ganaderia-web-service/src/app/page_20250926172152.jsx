"use client";

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouterSession } from "@/utils/routerSession";
import { useAuthContext } from "@/context/authContext";

const Home = () => {
  const { statusSessionUser } = useSelector((state) => state.register);
  const { sessionHome, isLoading: routerLoading } = useRouterSession();
  const { isLoading: authLoading } = useAuthContext();

  // 🔥 SOLUCIÓN: Esperar a que ambos estados de loading terminen
  useEffect(() => {
    // No ejecutar sessionHome hasta que todo esté cargado
    if (!authLoading && !routerLoading) {
      sessionHome();
    }
  }, [authLoading, routerLoading]); // Dependencias actualizadas

  // 🔥 OPCIONAL: Mostrar loading mientras se verifica la sesión
  if (authLoading || routerLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4'></div>
          <p className='text-gray-600'>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  const handleScroll = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {statusSessionUser === false && (
        <div className='bg-gray-100 text-gray-900 min-h-screen'>
          {/* Header Section */}
          <header className='bg-green-700 p-6 shadow-md'>
            <div className='container mx-auto flex justify-between items-center'>
              <h1 className='text-3xl font-bold text-white'>
                Sistema de Gestión Ganadera
              </h1>
              <nav>
                <ul className='flex space-x-6'>
                  <li>
                    <button
                      onClick={() => handleScroll("inicio")}
                      className='text-white hover:text-green-300'
                    >
                      Inicio
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleScroll("servicios")}
                      className='text-white hover:text-green-300'
                    >
                      Servicios
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleScroll("acerca")}
                      className='text-white hover:text-green-300'
                    >
                      Acerca de
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleScroll("contacto")}
                      className='text-white hover:text-green-300'
                    >
                      Contacto
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </header>

          {/* Main Content Section */}
          <main className='py-12'>
            <div className='container mx-auto text-center'>
              <section id='inicio'>
                <h2 className='text-4xl text-green-700 font-semibold mb-4'>
                  Bienvenidos al Sistema de Gestión Ganadera
                </h2>
                <p className='text-lg text-gray-700 mb-8'>
                  Administra tu producción ganadera de forma eficiente. Consulta
                  registros de terneros, madres y eventos importantes.
                </p>
              </section>

              {/* Highlights */}
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'>
                <section
                  id='servicios'
                  className='bg-green-800 p-6 rounded-lg shadow-lg text-white'
                >
                  <h3 className='text-2xl font-semibold flex items-center'>
                    <svg
                      className='w-6 h-6 mr-2'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M5 13l4 4L19 7'
                      ></path>
                    </svg>
                    Registro de Ganado
                  </h3>
                  <p className='mt-4'>
                    Lleva un control detallado de cada animal en tu establo con
                    nuestra plataforma.
                  </p>
                </section>
                <section className='bg-green-800 p-6 rounded-lg shadow-lg text-white'>
                  <h3 className='text-2xl font-semibold flex items-center'>
                    <svg
                      className='w-6 h-6 mr-2'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M9 12h6m-3-3v6'
                      ></path>
                    </svg>
                    Eventos y Seguimiento
                  </h3>
                  <p className='mt-4'>
                    Registra nacimientos, vacunaciones y otros eventos
                    importantes en tu ganadería.
                  </p>
                </section>
                <section
                  id='acerca'
                  className='bg-green-800 p-6 rounded-lg shadow-lg text-white'
                >
                  <h3 className='text-2xl font-semibold flex items-center'>
                    <svg
                      className='w-6 h-6 mr-2'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M3 12h18M9 5l3-3m0 0l3 3m-3-3v18'
                      ></path>
                    </svg>
                    Producción y Reportes
                  </h3>
                  <p className='mt-4'>
                    Obtén informes detallados sobre la producción y salud de tu
                    ganado.
                  </p>
                </section>
              </div>
            </div>
          </main>

          {/* Acerca de */}
          <section id='acerca' className='bg-green-700 text-white py-12'>
            <div className='container mx-auto text-center'>
              <h2 className='text-3xl font-semibold mb-4 flex items-center justify-center'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='w-8 h-8 mr-2'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21'
                  />
                </svg>
                Acerca de Nosotros
              </h2>
              <p className='text-lg max-w-2xl mx-auto'>
                Este proyecto es un sistema de gestión de terneros para
                ganaderos, específicamente enfocado en el registro y seguimiento
                del crecimiento, salud y eventos de los terneros desde su
                nacimiento hasta su desarrollo. Nuestra misión es brindar una
                solución eficiente para optimizar la gestión ganadera.
              </p>
            </div>
          </section>

          {/* Contacto */}
          <section id='contacto' className='bg-white text-gray-900 py-12'>
            <div className='container mx-auto text-center'>
              <h2 className='text-3xl font-semibold text-green-700 mb-4 flex items-center justify-center'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='w-8 h-8 mr-2'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z'
                  />
                </svg>
                Contacto
              </h2>
              <p className='text-lg max-w-2xl mx-auto mb-8'>
                ¿Tienes preguntas o necesitas más información? Contáctanos y con
                gusto resolveremos tus inquietudes.
              </p>
              <div className='flex justify-center'>
                <form className='bg-gray-100 p-6 rounded-lg shadow-lg w-full max-w-lg'>
                  <input
                    type='text'
                    placeholder='Nombre'
                    className='w-full p-2 mb-4 border border-gray-300 rounded-lg'
                  />
                  <input
                    type='email'
                    placeholder='Correo Electrónico'
                    className='w-full p-2 mb-4 border border-gray-300 rounded-lg'
                  />
                  <textarea
                    placeholder='Mensaje'
                    className='w-full p-2 mb-4 border border-gray-300 rounded-lg'
                  ></textarea>
                  <button
                    type='submit'
                    className='w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* Redes Sociales */}
          <section
            id='contacto'
            className='bg-green-400 p-10 rounded-lg shadow-md mt-12 text-white'
          >
            <h2 className='text-3xl font-semibold mb-4'>Contáctanos</h2>
            <p className='text-lg mb-6'>
              ¡Síguenos en nuestras redes sociales o contáctanos por correo!
            </p>
            <div className='flex justify-center space-x-6 text-2xl'>
              <a
                href='https://facebook.com'
                target='_blank'
                rel='noopener noreferrer'
                className='hover:text-gray-300'
              >
                📘 Facebook
              </a>
              <a
                href='https://twitter.com'
                target='_blank'
                rel='noopener noreferrer'
                className='hover:text-gray-300'
              >
                🐦 Twitter
              </a>
              <a
                href='https://instagram.com'
                target='_blank'
                rel='noopener noreferrer'
                className='hover:text-gray-300'
              >
                📸 Instagram
              </a>
              <a
                href='mailto:contacto@gestionganadera.com'
                className='hover:text-gray-300'
              >
                ✉️ Email
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default Home;
