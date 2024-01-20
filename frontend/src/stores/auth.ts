import { defineStore, type Pinia, type Store } from 'pinia'
import axios from '@/axios'
import { getActivePinia } from "pinia"

interface ExtendedPinia extends Pinia {
    _s: Map<string, Store>;
}

export const useAuthStore = defineStore({
    id: 'auth',
    state: () => ({
        token: localStorage.getItem('token') || '',
    }),

    getters: {
        isLoggedIn(): boolean {
            return !!this.token
        },
    },

    actions: {
        setToken(token: string) {
            this.token = token
            localStorage.setItem('token', token)
        },
        logout() {
            this.token = ''
            localStorage.clear()
            const pinia = getActivePinia() as ExtendedPinia;
            pinia._s.forEach((store: { $reset: () => any }) => store.$reset())
        },
        async login(email: string, password: string) {
            const response = await axios.post('/login', {
                email,
                password
            })
            this.setToken(response.data.token)
        },
        async register(email: string, password: string, name: string) {
            const reponse = await axios.post('/register', {
                email,
                password,
                name
            })
            this.setToken(reponse.data.token)
        }
    }
})
