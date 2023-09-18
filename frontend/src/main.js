import { createApp } from 'vue'
import App from './App.vue'
import * as dotenv from 'dotenv'

console.log(import.meta.env);
import './assets/main.css'

createApp(App).mount('#app')
