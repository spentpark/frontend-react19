export const environment = {
  apiUrl: import.meta.env.VITE_API_URL,
  /* Servicio de noticias (rss-game-node), en un backend distinto del catálogo */
  newsApiUrl: import.meta.env.VITE_NEWS_API_URL,
  /* Credenciales de desarrollo para obtener el JWT de la API de catálogo */
  apiUsername: import.meta.env.VITE_API_USERNAME,
  apiPassword: import.meta.env.VITE_API_PASSWORD
}
