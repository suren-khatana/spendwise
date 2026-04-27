/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Inject a strict Content-Security-Policy meta tag into the production build.
// The app loads zero remote origins at runtime — fonts are bundled, no
// analytics, no CDN — so a tight policy is essentially free. `connect-src
// 'none'` is the most valuable directive: any future XSS or compromised
// dependency cannot exfiltrate localStorage to a remote host.
//
// Limited to `apply: 'build'` so Vite's HMR WebSocket isn't blocked in dev.
function cspMetaPlugin(): Plugin {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      const directives = [
        "default-src 'self'",
        "script-src 'self'",
        // 'unsafe-inline' is required for Radix/shadcn inline positioning styles.
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data:",
        "connect-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ].join('; ')
      const meta = `<meta http-equiv="Content-Security-Policy" content="${directives}" />`
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`)
    },
  }
}

export default defineConfig({
  base: '/spendwise/',
  plugins: [react(), tailwindcss(), cspMetaPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
