import { http, isNotFoundError } from "./http"
import type { Pagination } from "./gameService"

export interface Review {
  id: number
  name?: string | null
  date?: string | null
  review: string
  score?: string | null
  source: string
  id_game?: number | null
}

export interface ReviewsResponse {
  data: Review[]
  pagination: Pagination
}

/* El detalle del juego muestra las reseñas de 10 en 10 */
export const REVIEWS_PAGE_SIZE = 10

/* RESEÑAS DE UN JUEGO */
export const getReviewsByGame = async (
  gameId: string | number,
  page: number,
  limit: number,
  signal?: AbortSignal
): Promise<ReviewsResponse> => {
  try {
    const response = await http.get<ReviewsResponse>(`/reviews/${gameId}`, {
      params: { page, limit },
      signal
    })

    return response.data
  } catch (error) {
    /* Un juego sin reseñas responde 404: se traduce a una página vacía para que
       la vista solo tenga que pintar el estado "sin reseñas" */
    if (isNotFoundError(error)) {
      return {
        data: [],
        pagination: {
          currentPage: page,
          perPage: limit,
          totalRecords: 0,
          totalPages: 0
        }
      }
    }

    throw error
  }
}
