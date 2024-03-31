import axios from "axios";
import { environment } from "./helper/environment";
import iconv from "iconv";
import log, { Scope } from "./helper/logger";

const instance = axios.create();

instance.interceptors.request.use((config) => {
    config.headers.Cookie = "DSGVO_ZUSAGE_V1=true;cookieconsent_status=allow;waconcookiemanagement=min;"
    config.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"

    // Limit the maximum content length to prevent abuse
    config.maxContentLength = +environment.maxContentLength;

    if (config.responseType !== "stream") config.responseType = "arraybuffer"
    return config
}, (error) => {
    return Promise.reject(error);
})

instance.interceptors.response.use(response => {
    if (response.config.responseType === "stream") return response;

    const charset = response.headers["content-type"]?.toLowerCase().match(/charset=([^;]*)/)?.[1]

    if (charset && charset !== "utf-8") {
        log(`Detected charset: ${charset}. Converting to utf-8.`, Scope.REQUESTS);
        const converter = new iconv.Iconv(charset, 'utf-8');
        response.data = converter.convert(response.data).toString()
    }

    return response;
})

export default instance;