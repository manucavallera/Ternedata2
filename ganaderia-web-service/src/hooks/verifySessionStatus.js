import businessApi from "@/api/bussines-api";



export const verifySessionStatus = () => {


    const verifySessionMethod = async (id,token) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get(`/users/${id}/${token}`);

            return {
                data: data,
                config: config,
                headers: headers,
                status: status,
                statusText: statusText,
                request: request
            }

        } catch (error) {
            return error.response.status;
        }
    }

    return {
        verifySessionMethod,
    }
}