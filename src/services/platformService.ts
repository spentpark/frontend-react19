import { http } from "./http"

export interface Platform {
  id: number
  description: string
  url: string
}

export const getPlatforms = async (signal?: AbortSignal): Promise<Platform[]> => {
  const response = await http.get<Platform[]>("/platforms", { signal })

  return response.data
}
