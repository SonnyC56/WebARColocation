import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    https: {
      // For local development, use self-signed cert
      // Generate with: openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
      key: fs.existsSync(path.resolve(__dirname, 'key.pem')) 
        ? fs.readFileSync(path.resolve(__dirname, 'key.pem'))
        : undefined,
      cert: fs.existsSync(path.resolve(__dirname, 'cert.pem'))
        ? fs.readFileSync(path.resolve(__dirname, 'cert.pem'))
        : undefined,
    },
    host: true, // Allow external connections
  },
  build: {
    target: 'esnext',
  },
  // Camera Kit requires specific CSP settings
  // Note: You'll also need to configure CSP headers in your deployment (Vercel)
  // connect-src: https://*.snapar.com
  // script-src: https://cf-st.sc-cdn.net/ blob: 'wasm-unsafe-eval'
})
