import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/authStore'
import { useUiStore } from './stores/uiStore'
import './styles/index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const uiStore = useUiStore()
const authStore = useAuthStore()

uiStore.restoreClientPreferences()
authStore.restoreSession()

app.use(router)
app.mount('#app')
