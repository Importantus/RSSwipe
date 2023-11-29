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

export default instance;



