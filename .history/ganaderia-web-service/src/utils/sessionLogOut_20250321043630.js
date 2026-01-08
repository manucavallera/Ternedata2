"use client";

import { setAuthPayload , setStatus,setUserData} from "@/store/auth";

const sessionLogOutMethod = (dispatch) => {
        localStorage.removeItem("token");
        localStorage.removeItem("userSelected");
        dispatch(setAuthPayload({}));
        dispatch(setStatus("no-authenticated"));
        dispatch(setUserData({}));
        return null;
}

export default sessionLogOutMethod;