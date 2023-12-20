<script setup lang="ts">
</script>

<template>
    <div class="flex flex-col p-5 h-full justify-center items-center">
        <div class=" font-text opacity-20 text-left text-[20vw]">
            [404]
        </div>
        <div class="flex items-center justify-center flex-col ">
            <img src="/images/MessyDoodle.svg" alt="Messy" class="w-[80%] pt-5 pb-5" />
            <h2 class="text-secondary-500 text-center">We looked everywhere and couldn't find the thing you're looking
                for...</h2>
        </div>
        <button class="w-full h-14 bg-amber-600 rounded-lg mt-10 hover:bg-amber-700 transition">
            <router-link to="/" class="p-5">
                Go back home
            </router-link>
        </button>
    </div>
</template>