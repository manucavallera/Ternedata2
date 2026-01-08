"use client"

import { useAuthSession } from '@/hooks/auth'
import React, { useEffect,useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useRouterSession } from '@/utils/routerSession'
import { setStatusRegister, setStatusSessionUser } from '@/store/register'
import { useAuthContext } from '@/context/authContext'

const Login = () => {

  const dispatch = useDispatch();

  const { loginHooks } = useAuthSession();
  const {sessionLogin} = useRouterSession();

  const { register, handleSubmit, formState: { errors } } = useForm();
  const [userAlert, setUserAlert] = useState({ status: false, message: "" });

  const {statusRegister,statusSessionUser} = useSelector(state => state.register);
  
  const {login} = useAuthContext();
    
      const onSubmit = handleSubmit(async data => {
                  const userCredentials = {
                    email: data.email,
                    password: data.password
                  };
                  const res = await loginHooks(userCredentials);
                  if (res === 401) {
                    setUserAlert({ status: true, message: "ERROR: Credenciales incorrectas" });
                  } else {
                    sessionLogin(true);
                    dispatch(setStatusSessionUser(true)); 
                    login(res?.data?.token);
                  }
      });

  
      useEffect(() => {
        if (statusRegister === true ) { // Marcamos que ya se ejecutó el dispatch
          const timer = setTimeout(() => {
            dispatch(setStatusRegister(false));
          }, 2000);

          // Limpiamos el timeout si el componente se desmonta o si el status cambia antes de los 5 segundos
          return () => clearTimeout(timer);
        }
      }, [statusRegister, dispatch]);

      useEffect(()=> {
        sessionLogin();
      },[])

  return (
    <>
      {statusSessionUser === false && (
        <div className='h-[calc(100vh-7rem)] flex justify-center items-center'>
          <form onSubmit={onSubmit} className='w-1/4 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4'>
            {statusRegister && (
              <p className="bg-green-500 text-white text-center text-sm font-semibold p-2 rounded-md shadow-md mt-2 mb-5">
                EL USUARIO SE HA REGISTRADO CORRECTAMENTE
              </p>
            )}
  
            <h1 className='font-bold text-4xl mb-4 text-gray-700'>Acceso Login</h1>
  
            <label htmlFor='email' className='block text-gray-700 text-sm font-bold mb-2'>Email</label>
            <input
              type='email'
              placeholder='email@gmail.com'
              {...register("email", {
                required: "Email es requerido",
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              })}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.email && <p className='text-red-500 text-xs'>{errors.email.message}</p>}
  
            <label htmlFor='password' className='block text-gray-700 text-sm font-bold mb-2'>Password</label>
            <input
              type='password'
              placeholder='password'
              {...register("password", {
                required: "Password es requerido",
                minLength: { value: 8, message: "Debe tener al menos 8 caracteres" },
              })}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
            />
            {errors.password && <p className='text-red-500 text-xs'>{errors.password.message}</p>}
  
            <button className='w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500' type='submit'>Login</button>
  
            {userAlert?.status && (
              <p className="bg-red-500 text-white text-center text-sm font-semibold p-2 rounded-md shadow-md mt-2">
                {userAlert?.message}
              </p>
            )}
          </form>
        </div>
      )}
    </>
  );
}  

export default Login;




