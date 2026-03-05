import { http } from "./http"

export interface Game {
  id: number
  title: string
  platform: string
}

export interface GameDetail {
  id: number
  title: string
  description: string
  image_Large?: string
  Platform?: string
  Publisher?: string
  genre?: string
  players?: string
  releasedate?: string
  youtube_Trailer?: string
  youtube_Walk?: string
  youtube_ending?: string
  youtube_secrets?: string
  youtube_speedrun?: string
  youtube_review?: string
  spotify_ost?: string
}

export interface Pagination {
  currentPage: number
  perPage: number
  totalRecords: number
  totalPages: number
}

export interface ApiResponse {
  data: Game[]
  pagination: Pagination
}

/* LISTAR JUEGOS */
export const getGames = async (
  platform: string,
  page: number,
  limit: number
): Promise<ApiResponse> => {

  const response = await http.get<ApiResponse>("/games", {
    params: { platform, page, limit }
  })

  return response.data
}

/* BUSCAR JUEGOS */
export const searchGames = async (
  title: string,
  page: number,
  limit: number
): Promise<ApiResponse> => {

  const response = await http.get<ApiResponse>("/games/search", {
    params: { title, page, limit }
  })

  return response.data
}

/* OBTENER DETALLE DEL JUEGO */
export const getGameById = async (id: string | number): Promise<GameDetail> => {

  const response = await http.get<GameDetail>(`/games/${id}`)

  return response.data
}