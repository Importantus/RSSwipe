import './assets/main.css'

import { createApp } from 'vue'
import router from './router'
import store from "./stores/index";
import App from './App.vue'

const app = createApp(App)

app.use(store)
app.use(router)

app.mount('#app')
