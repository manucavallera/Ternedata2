"use client"

import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useAuthContext } from '@/context/authContext'
import sessionSuccessMethod from "./sessionSuccess";

export const useRouterSession = () => {
    const tokenString = localStorage.getItem("token");
    

    const dispatch = useDispatch();
    const router = useRouter(); 
    const {login} = useAuthContext();

    const sessionHome = () => {
        if(!tokenString){
            return router.push("/");
        } else {
            sessionSuccessMethod(dispatch);
            login(tokenString); 
            return router.push("/admin/dashboard");
        }
    }

    const sessionRegister = (status) => {
   
        if (tokenString) {
            sessionSuccessMethod(dispatch);
            login(tokenString); 
            return router.push("/admin/dashboard");
        }

        if (status === true) {
            return router.push("/auth/login");
        } else {
            return router.push("/auth/register");
        }
    }

    const sessionLogin = (status) => {
     
        if (status === true) {    
            return router.push("/admin/dashboard");
        }
        if (!tokenString) {
            return router.push("/auth/login");
        } else {
            sessionSuccessMethod(dispatch);
            login(tokenString); 
            return router.push("/admin/dashboard");
        }
    }

    return {
        sessionHome,
        sessionRegister,
        sessionLogin,
    }
}
