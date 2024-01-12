<script setup lang="ts">
</script>

<template>
    <div class="flex flex-col p-5 h-full justify-center items-center">
        <div class="font-text opacity-50 text-left text-5xl pb-10">
            [404]
        </div>
        <div class="flex items-center justify-center flex-col w-2/3">
            <img src="/images/MessyDoodle.svg" alt="Messy" class="w-[80%] pt-5 pb-5" />
            <h2 class="text-secondary-500 text-center">We looked everywhere and couldn't find the thing you're looking
                for...</h2>
            <router-link to="/"
                class="flex justify-center items-center w-full h-14 bg-amber-600 rounded-lg mt-10 hover:bg-amber-700 transition">
                Go back home
            </router-link>
        </div>
    </div>
</template>