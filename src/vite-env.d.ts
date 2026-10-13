/// <reference types="vite/client" />

/* Tipado explícito de las variables de entorno expuestas al cliente */
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
