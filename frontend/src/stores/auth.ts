import { defineStore } from 'pinia'
import axios from '@/axios'

export const useAuthStore = defineStore({
    id: 'auth',
    state: () => ({
        token: localStorage.getItem('token') || '',
    }),
    getters: {
        isLoggedIn(): boolean {
            // TODO: check if token is valid
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
            localStorage.removeItem('token')
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
    },
})