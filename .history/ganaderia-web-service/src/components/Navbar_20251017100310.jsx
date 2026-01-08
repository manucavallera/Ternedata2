"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import logAuthMethod from "@/utils/logAuth";
import { useRouter } from "next/navigation";
import sessionLogOutMethod from "@/utils/sessionLogOut";
import verifySession from "@/utils/verifySession";
import { setSeccionStatus } from "@/store/seccion";
import Image from "next/image";
import EstablecimientoBadge from "@/components/EstablecimientoBadge";
import EstablecimientoSelector from "@/components/EstablecimientoSelector";
import axios from "axios"; // ⬅️ NUEVO IMPORT

function Navbar() {
  const dispatch = useDispatch();
  const { authPayload, status, userPayload } = useSelector(
    (state) => state.auth
  );
  const router = useRouter();

  const [statusSession, setStatusSession] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [usuariosPendientes, setUsuariosPendientes] = useState(0); // ⬅️ NUEVO ESTADO

  const API_URL = "http://localhost:3001";
  const getToken = () => localStorage.getItem("token");

  // ⬅️ NUEVA FUNCIÓN: Cargar usuarios pendientes
  const cargarUsuariosPendientes = async () => {
    if (userPayload?.rol !== "admin") return; // Solo para admin

    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      // Contar usuarios inactivos SIN establecimiento
      const pendientes = response.data.filter(
        (u) => u.estado === "inactivo" && !u.id_establecimiento
      ).length;

      setUsuariosPendientes(pendientes);
    } catch (error) {
      console.error("Error al cargar usuarios pendientes:", error);
    }
  };

  const onClickLogOut = () => {
    sessionLogOutMethod(dispatch);
    logAuthMethod(dispatch, router);
  };

  useEffect(() => {
    const response = verifySession(authPayload, status);
    setStatusSession(response);
  }, [authPayload, status, userPayload]);

  // ⬅️ NUEVO USEEFFECT: Cargar usuarios pendientes
  useEffect(() => {
    if (userPayload?.rol === "admin") {
      cargarUsuariosPendientes();
      // Actualizar cada 30 segundos
      const interval = setInterval(cargarUsuariosPendientes, 30000);
      return () => clearInterval(interval);
    }
  }, [userPayload]);

  const onclickIngreso = () => {
    dispatch(setSeccionStatus(false));
  };

  const onclickListado = () => {
    dispatch(setSeccionStatus(true));
  };

  return (
    <nav className='flex justify-between items-center bg-green-400 text-white px-24 py-3 relative'>
      {status === "checking" ||
      (status !== "authenticated" && statusSession === false) ? (
        <h1 className='text-4xl font-bold text-white flex items-center'>
          <Image
            src='/images/logo.png'
            alt='Logo'
            className='h-10 w-10 mr-2 border-2 border-white rounded-full'
            width={35}
            height={35}
          />
          GANADERIA
        </h1>
      ) : (
        <>
          {/* Menú para realizar su tarea */}
          <button
            onClick={onclickIngreso}
            className='text-x font-bold flex items-center hover:text-green-500'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={1.5}
              stroke='currentColor'
              className='size-6'
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
            onClick={onclickListado}
            className='text-x font-bold flex items-center hover:text-green-500'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={1.5}
              stroke='currentColor'
              className='size-6'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z'
              />
            </svg>
            Listados
          </button>
        </>
      )}

      {/* Sección derecha con badges y usuario */}
      <ul className='flex gap-x-4 items-center'>
        {status === "checking" ||
        (status !== "authenticated" && statusSession === false) ? (
          <>
            <li>
              <Link href='/' className='text-xl font-bold'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='size-6 hover:text-green-500'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25'
                  />
                </svg>
              </Link>
            </li>
            <li>
              <Link href='/auth/login' className='text-xl font-bold'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='size-6 hover:text-green-500'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75'
                  />
                </svg>
              </Link>
            </li>
            <li>
              <Link href='/auth/register' className='text-xl font-bold'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='size-6 hover:text-green-500'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
                  />
                </svg>
              </Link>
            </li>
          </>
        ) : (
          <>
            {/* Badge del establecimiento */}
            <li>
              <EstablecimientoBadge />
            </li>

            {/* Selector de establecimiento (solo Admin) */}
            <li>
              <EstablecimientoSelector />
            </li>

            {/* ⬅️ NUEVO: Link al Admin Panel con Badge de Notificaciones */}
            {userPayload?.rol === "admin" && (
              <li>
                <Link href='/admin'>
                  <a className='relative flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all cursor-pointer'>
                    <span className='text-sm font-semibold'>🎛️ Admin</span>

                    {/* Badge de notificaciones */}
                    {usuariosPendientes > 0 && (
                      <span className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg'>
                        {usuariosPendientes}
                      </span>
                    )}
                  </a>
                </Link>
              </li>
            )}

            {/* Nombre del usuario */}
            <li>
              <h1 className='text-white font-semibold'>{`${userPayload?.name}`}</h1>
            </li>

            {/* Dropdown de perfil */}
            <li className='relative'>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className='text-xl font-bold flex items-center'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='size-6'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75'
                  />
                </svg>
              </button>
              {isProfileOpen && (
                <div
                  className='absolute right-0 mt-2 w-40 bg-white text-black shadow-lg rounded-md'
                  onMouseEnter={() => setIsProfileOpen(true)}
                  onMouseLeave={() => setIsProfileOpen(false)}
                >
                  <button className='block w-full text-center px-4 py-2 hover:bg-gray-200 text-black-500 flex items-center justify-center gap-2'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={1.5}
                      stroke='currentColor'
                      className='size-6'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z'
                      />
                    </svg>
                    Profile
                  </button>
                  <button className='block w-full text-center px-4 py-2 hover:bg-gray-200 text-black-500 flex items-center justify-center gap-2'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={1.5}
                      stroke='currentColor'
                      className='size-6'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
                      />
                    </svg>
                    Crear usuario
                  </button>
                  <button
                    onClick={onClickLogOut}
                    className='block w-full text-center px-4 py-2 hover:bg-gray-200 text-black-500 flex items-center justify-center gap-2'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={1.5}
                      stroke='currentColor'
                      className='size-6'
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
              )}
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
