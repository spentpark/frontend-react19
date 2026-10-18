import { http } from "./http"

export interface Platform {
  id: number
  description: string
  url: string
}

/* Número de plataformas pedidas de una sola vez: el menú lateral las lista
   todas y el backend pagina con `limit=10` por defecto */
const PLATFORMS_LIMIT = 200

/* La API responde la lista paginada ({ data, pagination }) */
interface PaginatedPlatforms {
  data: Platform[]
}

export const getPlatforms = async (signal?: AbortSignal): Promise<Platform[]> => {
  const response = await http.get<Platform[] | PaginatedPlatforms>("/platforms", {
    params: { limit: PLATFORMS_LIMIT },
    signal
  })

  /* Desempaquetamos la paginación; se tolera un array plano por si el backend
     devuelve la colección sin envoltorio */
  return Array.isArray(response.data) ? response.data : (response.data?.data ?? [])
}
