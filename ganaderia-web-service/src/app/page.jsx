"use client";

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouterSession } from "@/utils/routerSession";
import { useAuthContext } from "@/context/authContext";
import ClientOnly from "@/components/ClientOnly";
import Landing from "@/components/landing/Landing";

const Home = () => {
  const { statusSessionUser } = useSelector((state) => state.register);
  const { sessionHome, isLoading: routerLoading } = useRouterSession();
  const { isLoading: authLoading } = useAuthContext();

  useEffect(() => {
    if (!authLoading && !routerLoading) {
      sessionHome();
    }
  }, [authLoading, routerLoading]);

  return (
    <ClientOnly
      fallback={
        <div className='flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600'></div>
        </div>
      }
    >
      {statusSessionUser === false && <Landing />}
    </ClientOnly>
  );
};

export default Home;
