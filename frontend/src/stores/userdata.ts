import axios from "@/axios";
import { defineStore } from "pinia";
import { useAuthStore } from "./auth";
import router from "@/router";

export interface Userdata {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
}

export const useUserdataStore = defineStore({
    id: 'userdata',
    state: () => ({
        userdata: {} as Userdata,
        error: '',
        success: '',
    }),

    actions: {
        async updateUserDetails() {
            try {
                console.log("Updating user details")
                const response = await axios.put('/user', {
                    name: this.userdata.name,
                    email: this.userdata.email,
                });

                if (response.status === 200) {
                    this.error = '';
                    this.success = 'User data updated successfully';
                }
            } catch (error: any) {
                console.error('Failed to update user data', error);
                this.error = error.response.data.message;
            }
        },
        async updateUserPassword(password: string, oldPassword: string) {
            try {
                const response = await axios.put('/user', { password, oldPassword });

                if (response.status === 200) {
                    this.error = '';
                    this.success = 'User password updated successfully';
                } else {
                    this.error = response.data.message;
                }
            } catch (error: any) {
                console.error('Failed to update user password', error);
                if (error.response.status === 403) {
                    this.error = 'Old password is incorrect';
                } else {
                    this.error = error.response.data.message;
                }
            }
        },
        async fetchUserData() {
            try {
                this.success = '';
                const response = await axios.get('/user');

                if (response.status === 200) {
                    this.error = '';
                } else {
                    this.error = response.data.message;
                }

                this.userdata = response.data;
                this.userdata.createdAt = new Date(this.userdata.createdAt);
            } catch (error: any) {
                console.error('Failed to fetch user data', error);
                this.error = error.response.data.message;
            }
        },
        async deleteUser(password: string) {
            try {
                const response = await axios.delete('/user', {
                    data: { password },
                });

                const authStore = useAuthStore();
                authStore.logout();

                router.push({ name: 'Login' });

                if (response.status === 200) {
                    this.error = '';
                    this.success = 'User deleted successfully';
                } else {
                    this.error = response.data.message;
                }
            } catch (error: any) {
                console.error('Failed to delete user', error);
                if (error.response.status === 403) {
                    this.error = 'Password is incorrect';
                } else {
                    this.error = error.response.data.message;
                }
            }
        }
    }
})
