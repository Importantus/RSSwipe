import axios from "axios";
import { environment } from "./helper/environment";

const instance = axios.create();

instance.interceptors.request.use((config) => {
    config.headers.Cookie = "DSGVO_ZUSAGE_V1=true;cookieconsent_status=allow;waconcookiemanagement=min;"
    config.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"

    // Limit the maximum content length to prevent abuse
    config.maxContentLength = +environment.maxContentLength;
    return config
}, (error) => {
    return Promise.reject(error);
})

export default instance;