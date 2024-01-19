import axios from "axios";

const instance = axios.create();

instance.interceptors.request.use((config) => {
    config.headers.Cookie = "DSGVO_ZUSAGE_V1=true; cookieconsent_status=allow"
    return config
}, (error) => {
    return Promise.reject(error);
})

export default instance;