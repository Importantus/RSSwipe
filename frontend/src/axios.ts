import axios from 'axios';
import { useAuthStore } from './stores/auth';

const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL + '/v1'
});

instance.interceptors.request.use((config) => {
    const authStore = useAuthStore()

    if (authStore.isLoggedIn) {
        config.headers.Authorization = `Bearer ${authStore.token}`
    }

    return config
}, (error) => {
    return Promise.reject(error);
})

//Go to 404 page if 404 error
instance.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response.status === 404) {
        window.location.href = '/404'
    }

    return Promise.reject(error);
})

export default instance;



