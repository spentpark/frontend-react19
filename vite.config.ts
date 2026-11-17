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
    /* Los pools de VM montan jsdom una vez por worker en lugar de una vez por
       fichero (en Jenkins ese montaje era el 57% del tiempo de la suite) y
       mantienen el aislamiento entre ficheros. `vmForks` conserva el modelo de
       procesos de `forks`, que es el más compatible con React 19. */
    pool: "vmForks",
    /* En Jenkins el contenedor anuncia todas las CPUs del host aunque su cuota
       real sea mucho menor: con el valor por defecto Vitest lanzaba un worker
       por CPU, se quedaban sin CPU y el arranque agotaba el timeout de 60 s
       ("Failed to start forks worker ... Timeout waiting for worker to respond").
       Dos workers bastan porque todas las transformaciones pasan por un único
       servidor de Vite; más workers solo añaden contención y memoria. */
    maxWorkers: 2,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      /* El CSS no aporta sentencias JS: ensuciaría el informe de cobertura */
      exclude: ["src/**/*.css"]
    }
  }
})
