import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Unregister any old service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
      console.log('Unregistered old service worker')
    }
  })
}

const app = createApp(App)
app.use(router)
app.mount('#app')
