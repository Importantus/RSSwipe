import './assets/main.css'

import { createApp } from 'vue'
import router from './router'
import store from "./stores/index";
import App from './App.vue'
import Vue3TouchEvents from "vue3-touch-events";


const app = createApp(App)

app.use(store)
app.use(router)
app.use(Vue3TouchEvents, {
    disableClick: true,
})

app.mount('#app')
