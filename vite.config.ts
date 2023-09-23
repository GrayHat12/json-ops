import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      mode: "development",
      minify: true,
      manifest: {
        orientation: "portrait",
        name: "Json Comparison",
        background_color: "#448aff",
        theme_color: "#0072f4",
        display: "standalone",
        icons: [
          { src: "/icons/maskable_icon_x48.png", type: "image/png", sizes: "48x48", purpose: "maskable" },
          { src: "/icons/maskable_icon_x72.png", type: "image/png", sizes: "72x72", purpose: "maskable" },
          { src: "/icons/maskable_icon_x96.png", type: "image/png", sizes: "96x96", purpose: "maskable" },
          { src: "/icons/maskable_icon_x128.png", type: "image/png", sizes: "128x128", purpose: "maskable" },
          { src: "/icons/maskable_icon_x192.png", type: "image/png", sizes: "192x192", purpose: "maskable" },
          { src: "/icons/maskable_icon_x384.png", type: "image/png", sizes: "384x384", purpose: "maskable" },
          { src: "/icons/maskable_icon_x512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
          { src: "/icons/maskable_icon.png", type: "image/png", sizes: "1024x1024", purpose: "maskable" },
          { src: "/icons/maskable_icon.png", type: "image/png", sizes: "1024x1024" },
          { src: "/icon.svg", type: "image/png", sizes: "320x320" },
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), '/home/grayhat/desktop/github/personal/useWorker/']
    }
  }
})
