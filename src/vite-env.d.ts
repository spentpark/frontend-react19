/// <reference types="vite/client" />

/* Tipado explícito de las variables de entorno expuestas al cliente */
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_NEWS_API_URL: string
  readonly VITE_API_USERNAME: string
  readonly VITE_API_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
