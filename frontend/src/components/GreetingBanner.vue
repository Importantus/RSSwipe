<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Liste von Begrüßungsnachrichten auf Englisch
const greetings = [
    'Hello, world!',
    'Welcome back!',
    'Great to see you!',
    'Have a wonderful day!',
    'Let’s get started!'
];
const greeting = ref('');

// Funktion um eine zufällige Begrüßung auszuwählen
function chooseRandomGreeting() {
    const randomIndex = Math.floor(Math.random() * greetings.length);
    greeting.value = greetings[randomIndex];
}

// Wählen Sie eine zufällige Begrüßung aus, wenn die Komponente gemounted wird
onMounted(chooseRandomGreeting);
</script>

<template>
  <div class="text-2xl text-center">
    <h1>{{ greeting }}</h1>
  </div>
</template>
