<script setup lang="ts">
import { ref, onMounted } from 'vue';

const greetings = [
  'Hello, world!',
  'Welcome back!',
  'Great to see you!',
  'Have a wonderful day!',
  'Let’s get started!'
];
const greeting = ref('');

function chooseRandomGreeting() {
  const randomIndex = Math.floor(Math.random() * greetings.length);
  greeting.value = greetings[randomIndex];
}

onMounted(chooseRandomGreeting);
</script>

<template>
  <div class="text-2xl text-center">
    <h1>{{ greeting }}</h1>
  </div>
</template>
