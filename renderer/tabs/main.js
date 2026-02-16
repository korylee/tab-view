import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
// src\main.ts
import 'virtual:svg-icons-register'
import './style.css'

// import router from './router'
const app = createApp(App)

// app.use(router)
app.use(createPinia())

app.mount('#app')
