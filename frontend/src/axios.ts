import axios from 'axios';
import { useAuthStore } from './stores/auth';
import router from './router';

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

instance.interceptors.response.use((response) => {
    return response;
}, (error) => {
    // Go to 404 page if 404 error
    if (error.response.status === 404) {
        router.push('/404')
    }

    // When the token is expired or invalid, logout the user
    if (error.response.status === 401) {
        const authStore = useAuthStore()
        authStore.logout()
        router.push('/login')
    }

    return Promise.reject(error);
})

export default instance;



