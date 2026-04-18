"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import logAuthMethod from "@/utils/logAuth";
import { useRouter, usePathname } from "next/navigation";
import sessionLogOutMethod from "@/utils/sessionLogOut";
import verifySession from "@/utils/verifySession";
import { setSeccionStatus } from "@/store/seccion";
import Image from "next/image";
import EstablecimientoBadge from "@/components/EstablecimientoBadge";
import EstablecimientoSelector from "@/components/EstablecimientoSelector";
import { equipoService } from "@/api/equipoRepo";
import businessApi from "@/api/bussines-api";

function Navbar() {
  const dispatch = useDispatch();
  const { authPayload, status, userPayload } = useSelector(
    (state) => state.auth
  );
  const router = useRouter();
  const pathname = usePathname();

  const [statusSession, setStatusSession] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [usuariosPendientes, setUsuariosPendientes] = useState(0);
  const [nombreEstablecimiento, setNombreEstablecimiento] = useState(null);

  const cargarInvitacionesPendientes = useCallback(async () => {
    if (userPayload?.rol !== "admin") return;
    const estId = userPayload?.id_establecimiento;
    if (!estId) return;

    try {
      const pendientes = await equipoService.getPendientes(estId);
      const ahora = new Date();
      const activas = (pendientes || []).filter(
        (inv) => new Date(inv.expiracion) > ahora
      ).length;
      setUsuariosPendientes(activas);
    } catch {
      setUsuariosPendientes(0);
    }
  }, [userPayload?.rol, userPayload?.id_establecimiento]);

  const onClickLogOut = () => {
    sessionLogOutMethod(dispatch);
    logAuthMethod(dispatch, router);
  };

  useEffect(() => {
    const response = verifySession(authPayload, status);
    setStatusSession(response);
  }, [authPayload, status, userPayload]);

  useEffect(() => {
    if (userPayload?.rol === "admin" && userPayload?.id_establecimiento) {
      cargarInvitacionesPendientes();
      const interval = setInterval(cargarInvitacionesPendientes, 30000);
      return () => clearInterval(interval);
    }
  }, [userPayload?.rol, userPayload?.id_establecimiento]);

  useEffect(() => {
    if (userPayload?.rol === "operario" && userPayload?.id_establecimiento) {
      businessApi.get("/establecimientos")
        .then((res) => {
          const est = res.data?.find(
            (e) => e.id_establecimiento === userPayload.id_establecimiento
          );
          if (est) setNombreEstablecimiento(est.nombre);
        })
        .catch(() => {});
    }
  }, [userPayload?.rol, userPayload?.id_establecimiento]);

  const onclickIngreso = () => {
    // Si no estamos en /admin/dashboard, navegar primero
    if (pathname !== "/admin/dashboard") {
      router.push("/admin/dashboard");
    }
    dispatch(setSeccionStatus(false));
    setIsMobileMenuOpen(false);
  };

  const onclickListado = () => {
    // Si no estamos en /admin/dashboard, navegar primero
    if (pathname !== "/admin/dashboard") {
      router.push("/admin/dashboard");
    }
    dispatch(setSeccionStatus(true));
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className='bg-green-400 text-white px-3 sm:px-6 md:px-12 lg:px-24 py-3 relative'>
      {/* Estilos para la animación de brillo */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow-pulse {
          0%, 100% { text-shadow: 0 0 8px rgba(255,255,255,0.6), 0 0 20px rgba(134,239,172,0.4); }
          50% { text-shadow: 0 0 16px rgba(255,255,255,0.9), 0 0 40px rgba(134,239,172,0.7), 0 0 60px rgba(74,222,128,0.3); }
        }
        .brand-shimmer {
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #d1fae5 20%,
            #86efac 35%,
            #fde68a 50%,
            #86efac 65%,
            #d1fae5 80%,
            #ffffff 100%
          );
          background-size: 250% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite, glow-pulse 2.5s ease-in-out infinite;
          filter: drop-shadow(0 0 6px rgba(255,255,255,0.4));
        }
        .brand-shimmer:hover {
          animation: shimmer 1.2s linear infinite, glow-pulse 1s ease-in-out infinite;
          filter: drop-shadow(0 0 12px rgba(255,255,255,0.8));
        }
      `}</style>

      <div className='grid grid-cols-3 items-center gap-2'>
        {/* === COLUMNA IZQUIERDA: Menú navegación / Botón Home === */}
        <div className='flex items-center gap-2 min-w-0'>
          {status === "authenticated" && statusSession !== false ? (
            <>
              {/* Botones principales - Desktop */}
              <div className='hidden lg:flex gap-3'>
                <button
                  onClick={onclickIngreso}
                  className='text-sm font-bold flex items-center hover:text-green-200 transition-colors duration-200 gap-1'
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' />
                  </svg>
                  Ingresos
                </button>

                <button
                  onClick={() => router.push("/rodeos")}
                  className='text-sm font-bold flex items-center hover:text-green-200 transition-colors duration-200 gap-1'
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' />
                  </svg>
                  Rodeos
                </button>

                <button
                  onClick={onclickListado}
                  className='text-sm font-bold flex items-center hover:text-green-200 transition-colors duration-200 gap-1'
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z' />
                  </svg>
                  Listados
                </button>
              </div>

              {/* Hamburger button - Mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className='lg:hidden flex items-center hover:text-green-200 transition-colors'
              >
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  {isMobileMenuOpen ? (
                    <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
                  ) : (
                    <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' />
                  )}
                </svg>
              </button>
            </>
          ) : (
            <Link href='/' className='text-xl font-bold'>
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5 hover:text-green-200 transition-colors'>
                <path strokeLinecap='round' strokeLinejoin='round' d='m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' />
              </svg>
            </Link>
          )}
        </div>

        {/* === COLUMNA CENTRAL: Logo + TerneData (siempre visible y centrado) === */}
        <div
          className='flex items-center justify-center group cursor-pointer'
          onClick={() => {
            if (status === "authenticated") {
              if (pathname !== "/admin/dashboard") router.push("/admin/dashboard");
            } else {
              router.push("/");
            }
          }}
        >
          <Image
            src='/images/logo.png'
            alt='Logo TerneData'
            className='h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 mr-2 border-2 border-white rounded-full transition-all duration-500 group-hover:rotate-[360deg] group-hover:scale-110 shadow-[0_0_12px_rgba(255,255,255,0.5)] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.8)]'
            width={40}
            height={40}
          />
          <h1 className='text-xl sm:text-2xl md:text-3xl font-black tracking-widest brand-shimmer transition-all duration-300 group-hover:tracking-[0.2em] select-none uppercase'>
            TerneData
          </h1>
        </div>

        {/* === COLUMNA DERECHA: Auth / Info usuario === */}
        <div className='flex items-center justify-end gap-x-2 min-w-0'>
          {status === "checking" ||
          (status !== "authenticated" && statusSession === false) ? (
            <>
              <Link href='/auth/login' className='flex items-center gap-1 bg-white text-green-700 font-semibold text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors'>
                Ingresar
              </Link>
              <Link href='/auth/register' className='flex items-center gap-1 bg-green-600 text-white font-semibold text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors'>
                Registrarse
              </Link>
            </>
          ) : (
            <ul className='hidden lg:flex gap-x-2 xl:gap-x-4 items-center'>
              <li className='hidden xl:block'>
                <EstablecimientoBadge />
              </li>

              <li>
                <EstablecimientoSelector />
              </li>

              {userPayload?.rol === "operario" && nombreEstablecimiento && (
                <li>
                  <div className='bg-green-600 text-white border border-white rounded px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold flex items-center gap-1'>
                    🏢 {nombreEstablecimiento}
                  </div>
                </li>
              )}

              {userPayload?.rol === "admin" && (
                <li>
                  <Link
                    href='/panel-admin'
                    className='relative flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all cursor-pointer'
                  >
                    <span className='text-xs sm:text-sm font-semibold'>🎛️ Admin</span>

                    {usuariosPendientes > 0 && (
                      <span className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center animate-pulse shadow-lg'>
                        {usuariosPendientes}
                      </span>
                    )}
                  </Link>
                </li>
              )}

              <li>
                <h1 className='text-white font-semibold text-xs sm:text-sm'>
                  {`${userPayload?.name}`}
                </h1>
              </li>

              <li className='relative'>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className='text-xl font-bold flex items-center'
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75' />
                  </svg>
                </button>
                {isProfileOpen && (
                  <div
                    className='absolute right-0 mt-2 w-40 bg-white text-black shadow-lg rounded-md z-50'
                    onMouseEnter={() => setIsProfileOpen(true)}
                    onMouseLeave={() => setIsProfileOpen(false)}
                  >
                    <Link
                      href='/perfil'
                      onClick={() => setIsProfileOpen(false)}
                      className='block w-full text-center px-3 py-2 hover:bg-gray-200 text-black-500 flex items-center justify-center gap-2 text-sm'
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z' />
                      </svg>
                      Mi Perfil
                    </Link>
                    <button className='block w-full text-center px-3 py-2 hover:bg-gray-200 text-black-500 flex items-center justify-center gap-2 text-sm'>
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' />
                      </svg>
                      Crear usuario
                    </button>
                    <button
                      onClick={onClickLogOut}
                      className='block w-full text-center px-3 py-2 hover:bg-gray-200 text-black-500 flex items-center justify-center gap-2 text-sm'
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15' />
                      </svg>
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && status === "authenticated" && (
        <div className='lg:hidden absolute top-full left-0 right-0 bg-green-500 shadow-lg z-50 py-4 px-3'>
          <div className='flex flex-col gap-3'>
            <button
              onClick={onclickIngreso}
              className='flex items-center gap-2 px-3 py-2 hover:bg-green-600 rounded text-sm font-semibold'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-5 h-5'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
                />
              </svg>
              Ingresos
            </button>

            <button
              onClick={() => {
                router.push("/rodeos");
                setIsMobileMenuOpen(false);
              }}
              className='flex items-center gap-2 px-3 py-2 hover:bg-green-600 rounded text-sm font-semibold'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-5 h-5'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z'
                />
              </svg>
              Rodeos
            </button>

            <button
              onClick={onclickListado}
              className='flex items-center gap-2 px-3 py-2 hover:bg-green-600 rounded text-sm font-semibold'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-5 h-5'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z'
                />
              </svg>
              Listados
            </button>

            <div className='border-t border-green-600 my-2'></div>

            <div className='px-3 py-2'>
              <EstablecimientoBadge />
            </div>

            {userPayload?.rol === "operario" && nombreEstablecimiento && (
              <div className='px-3 py-2 flex items-center gap-2 text-sm font-semibold'>
                🏢 {nombreEstablecimiento}
              </div>
            )}

            {userPayload?.rol === "admin" && (
              <Link
                href='/panel-admin'
                onClick={() => setIsMobileMenuOpen(false)}
                className='flex items-center gap-2 px-3 py-2 hover:bg-green-600 rounded text-sm font-semibold'
              >
                🎛️ Panel Admin
                {usuariosPendientes > 0 && (
                  <span className='bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center'>
                    {usuariosPendientes}
                  </span>
                )}
              </Link>
            )}

            <Link
              href='/perfil'
              onClick={() => setIsMobileMenuOpen(false)}
              className='flex items-center gap-2 px-3 py-2 hover:bg-green-600 rounded text-sm font-semibold'
            >
              👤 Mi Perfil
            </Link>

            <button
              onClick={() => {
                onClickLogOut();
                setIsMobileMenuOpen(false);
              }}
              className='flex items-center gap-2 px-3 py-2 hover:bg-green-600 rounded text-sm font-semibold text-left'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-5 h-5'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15'
                />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
