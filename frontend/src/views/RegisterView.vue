<script setup lang="ts">
import TextInputIcon from '@/components/global/TextInputField.vue';
import router from '@/router';
import { useAuthStore } from '@/stores/auth';
import { onMounted, ref } from 'vue';
import { User, Mail, KeyRound, Link2 } from 'lucide-vue-next';
import { useSettingsStore } from '@/stores/settings';

const authStore = useAuthStore();
const settingsStore = useSettingsStore()

const password = ref('');
const email = ref('');
const name = ref('');
const error = ref('');
const backendUrl = ref('');
const storedBackendUrl = ref<string | undefined>('');

onMounted(async () => {
    storedBackendUrl.value = settingsStore.getRawBackendUrl() || await settingsStore.fetchBackendUrl();
    backendUrl.value = storedBackendUrl.value || "";
});

async function handleSubmit() {
    error.value = '';
    console.log("handleLogin")
    try {
        await authStore.register(backendUrl.value, email.value, password.value, name.value);
        settingsStore.setBackendUrl(backendUrl.value);
        router.push('/');
    } catch (e: any) {
        console.log("Fehler: " + e);
        if (e?.response?.data?.message)
            error.value = e.response.data.message;
        else error.value = e.message;
    }
}
</script>

<template>
    <div class="min-h-full w-full flex pt-[15vh] items-center mx flex-col gap-5 px-5 relative">
        <div class="h-[25vh] w-full z-10">
            <img src="/images/logo-big.svg" alt="Logo" class="w-[50%] m-auto" />
        </div>
        <div class="w-full flex flex-col gap-5 items-center relative">
            <img src="/images/login-background.png" alt="Hero" class="absolute bottom-20 -right-10 z-0 object-cover" />
            <div v-if="error" class="w-full bg-red-500 rounded-lg p-3 z-10">{{ error }}</div>
            <form @submit.prevent="handleSubmit" class="w-full z-10">
                <div class="flex flex-col gap-5">
                    <TextInputIcon v-model="backendUrl" placeholder="https://backend.example.com" :icon="Link2"
                        :required="true" title="Enter Backend Url" />
                    <TextInputIcon v-model="name" placeholder="Name" :icon="User" :required="true"
                        title="Enter your name" />
                    <TextInputIcon v-model="email" placeholder="Email" :icon="Mail" :required="true"
                        title="Enter your email" />
                    <TextInputIcon v-model="password" placeholder="Password" type="password" :icon="KeyRound"
                        :required="true" title="Enter your password" />
                </div>
                <button type="submit" class="w-full h-14 bg-amber-600 rounded-lg mt-10 hover:bg-amber-700 transition"
                    title="Create account">Register</button>
            </form>
            <div>
                Already have an account?
                <router-link to="/login" class="underline z-10" title="Account login">Login</router-link>
            </div>
        </div>
    </div>
</template>
