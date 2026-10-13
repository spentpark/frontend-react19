import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        /* Separa las dependencias del código de aplicación para mejorar el
           cacheo del navegador entre despliegues */
        manualChunks: (id) => {
          const path = id.replace(/\\/g, "/")

          if (path.includes("/node_modules/axios/")) {
            return "http-vendor"
          }

          if (
            path.includes("/node_modules/react/") ||
            path.includes("/node_modules/react-dom/") ||
            path.includes("/node_modules/react-router") ||
            path.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor"
          }

          return undefined
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage"
    }
  }
})
