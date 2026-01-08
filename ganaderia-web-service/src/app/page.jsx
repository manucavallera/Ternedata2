"use client";

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouterSession } from "@/utils/routerSession";
import { useAuthContext } from "@/context/authContext";
import ClientOnly from "@/components/ClientOnly";

const Home = () => {
  const { statusSessionUser } = useSelector((state) => state.register);
  const { sessionHome, isLoading: routerLoading } = useRouterSession();
  const { isLoading: authLoading } = useAuthContext();

  useEffect(() => {
    if (!authLoading && !routerLoading) {
      sessionHome();
    }
  }, [authLoading, routerLoading]);

  const handleScroll = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <ClientOnly
      fallback={
        <div className='flex items-center justify-center min-h-screen bg-gray-100'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4'></div>
            <p className='text-gray-600 text-sm sm:text-base'>Cargando...</p>
          </div>
        </div>
      }
    >
      {statusSessionUser === false && (
        <div className='bg-gray-100 text-gray-900 min-h-screen'>
          {/* Header Section */}
          <header className='bg-green-700 p-3 sm:p-4 md:p-6 shadow-md'>
            <div className='container mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0'>
              <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-white text-center sm:text-left'>
                TerneData
              </h1>
              <nav className='w-full sm:w-auto'>
                <ul className='flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6'>
                  <li>
                    <button
                      onClick={() => handleScroll("inicio")}
                      className='text-white hover:text-green-300 text-sm sm:text-base'
                    >
                      Inicio
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleScroll("servicios")}
                      className='text-white hover:text-green-300 text-sm sm:text-base'
                    >
                      Servicios
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleScroll("acerca")}
                      className='text-white hover:text-green-300 text-sm sm:text-base'
                    >
                      Acerca de
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleScroll("contacto")}
                      className='text-white hover:text-green-300 text-sm sm:text-base'
                    >
                      Contacto
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </header>

          {/* Main Content Section */}
          <main className='py-6 sm:py-8 md:py-12 px-3 sm:px-4'>
            <div className='container mx-auto text-center'>
              <section id='inicio'>
                <h2 className='text-2xl sm:text-3xl md:text-4xl text-green-700 font-semibold mb-3 sm:mb-4'>
                  Bienvenidos a TerneData
                </h2>
                <p className='text-sm sm:text-base md:text-lg text-gray-700 mb-6 sm:mb-8 px-3 sm:px-0'>
                  Administra tu producción ganadera de forma eficiente. Consulta
                  registros de terneros, madres y eventos importantes.
                </p>
              </section>

              {/* Highlights */}
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8'>
                <section
                  id='servicios'
                  className='bg-green-800 p-4 sm:p-5 md:p-6 rounded-lg shadow-lg text-white'
                >
                  <h3 className='text-lg sm:text-xl md:text-2xl font-semibold flex items-center justify-center sm:justify-start'>
                    <svg
                      className='w-5 h-5 sm:w-6 sm:h-6 mr-2'
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
                  <p className='mt-3 sm:mt-4 text-sm sm:text-base'>
                    Lleva un control detallado de cada animal en tu establo con
                    nuestra plataforma.
                  </p>
                </section>
                <section className='bg-green-800 p-4 sm:p-5 md:p-6 rounded-lg shadow-lg text-white'>
                  <h3 className='text-lg sm:text-xl md:text-2xl font-semibold flex items-center justify-center sm:justify-start'>
                    <svg
                      className='w-5 h-5 sm:w-6 sm:h-6 mr-2'
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
                  <p className='mt-3 sm:mt-4 text-sm sm:text-base'>
                    Registra nacimientos, vacunaciones y otros eventos
                    importantes en tu ganadería.
                  </p>
                </section>
                <section
                  id='acerca'
                  className='bg-green-800 p-4 sm:p-5 md:p-6 rounded-lg shadow-lg text-white'
                >
                  <h3 className='text-lg sm:text-xl md:text-2xl font-semibold flex items-center justify-center sm:justify-start'>
                    <svg
                      className='w-5 h-5 sm:w-6 sm:h-6 mr-2'
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
                  <p className='mt-3 sm:mt-4 text-sm sm:text-base'>
                    Obtén informes detallados sobre la producción y salud de tu
                    ganado.
                  </p>
                </section>
              </div>
            </div>
          </main>

          {/* Acerca de */}
          <section id='acerca' className='bg-green-700 text-white py-8 sm:py-10 md:py-12 px-3 sm:px-4'>
            <div className='container mx-auto text-center'>
              <h2 className='text-2xl sm:text-3xl font-semibold mb-3 sm:mb-4 flex items-center justify-center'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='w-6 h-6 sm:w-8 sm:h-8 mr-2'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21'
                  />
                </svg>
                Acerca de Nosotros
              </h2>
              <p className='text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-3 sm:px-0'>
                Este proyecto es un sistema de gestión de terneros para
                ganaderos, específicamente enfocado en el registro y seguimiento
                del crecimiento, salud y eventos de los terneros desde su
                nacimiento hasta su desarrollo. Nuestra misión es brindar una
                solución eficiente para optimizar la gestión ganadera.
              </p>
            </div>
          </section>

          {/* Contacto */}
          <section id='contacto' className='bg-white text-gray-900 py-8 sm:py-10 md:py-12 px-3 sm:px-4'>
            <div className='container mx-auto text-center'>
              <h2 className='text-2xl sm:text-3xl font-semibold text-green-700 mb-3 sm:mb-4 flex items-center justify-center'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='w-6 h-6 sm:w-8 sm:h-8 mr-2'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z'
                  />
                </svg>
                Contacto
              </h2>
              <p className='text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 px-3 sm:px-0'>
                ¿Tienes preguntas o necesitas más información? Contáctanos y con
                gusto resolveremos tus inquietudes.
              </p>
              <div className='flex justify-center'>
                <form className='bg-gray-100 p-4 sm:p-5 md:p-6 rounded-lg shadow-lg w-full max-w-lg'>
                  <input
                    type='text'
                    placeholder='Nombre'
                    className='w-full p-2 sm:p-3 mb-3 sm:mb-4 border border-gray-300 rounded-lg text-sm sm:text-base'
                  />
                  <input
                    type='email'
                    placeholder='Correo Electrónico'
                    className='w-full p-2 sm:p-3 mb-3 sm:mb-4 border border-gray-300 rounded-lg text-sm sm:text-base'
                  />
                  <textarea
                    placeholder='Mensaje'
                    className='w-full p-2 sm:p-3 mb-3 sm:mb-4 border border-gray-300 rounded-lg text-sm sm:text-base'
                    rows='3'
                  ></textarea>
                  <button
                    type='submit'
                    className='w-full py-2 sm:py-3 bg-indigo-600 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* Redes Sociales */}
          <section className='bg-green-400 p-6 sm:p-8 md:p-10 rounded-lg shadow-md mt-8 sm:mt-10 md:mt-12 text-white mx-3 sm:mx-4'>
            <h2 className='text-2xl sm:text-3xl font-semibold mb-3 sm:mb-4 text-center'>Contáctanos</h2>
            <p className='text-sm sm:text-base md:text-lg mb-4 sm:mb-6 text-center'>
              ¡Síguenos en nuestras redes sociales o contáctanos por correo!
            </p>
            <div className='flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 text-base sm:text-lg md:text-2xl'>
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
                � Twitter
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
    </ClientOnly>
  );
};

export default Home;
