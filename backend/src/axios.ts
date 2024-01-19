import axios from "axios";

const instance = axios.create();

instance.interceptors.request.use((config) => {
    config.headers.Cookie = "DSGVO_ZUSAGE_V1=true; cookieconsent_status=allow"
    config.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
    return config
}, (error) => {
    return Promise.reject(error);
})

export default instance;