import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import { environment } from "../config/environment"
import { ensureToken, LOGIN_PATH, refreshToken } from "./auth"

/** Marca de la petición ya reintentada: evita bucles de refresco ante `401`. */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean
}

/**
 * Cliente HTTP compartido de la aplicación. La URL base apunta al backend
 * Python (`VITE_API_URL`, p. ej. `http://localhost:7000/api`).
 */
export const http = axios.create({
  baseURL: environment.apiUrl,
  headers: {
    "Content-Type": "application/json"
  }
})

/** `true` si la URL es el propio login (no debe llevar `Bearer`). */
function isLoginRequest(url: string | undefined): boolean {
  return typeof url === "string" && url.includes(LOGIN_PATH)
}

/**
 * Añade el JWT del catálogo a todas las peticiones salvo al login.
 *
 * El backend Python exige `Authorization: Bearer <jwt>` en todas las rutas de
 * negocio (juegos, plataformas, reseñas, similares y estadísticas), con el
 * mismo esquema y secreto que backend-node20.
 */
http.interceptors.request.use(async (config) => {
  if (isLoginRequest(config.url) || config.headers.has("Authorization")) {
    return config
  }

  const token = await ensureToken()
  config.headers.set("Authorization", `Bearer ${token}`)

  return config
})

/**
 * Ante un `401` renueva el token una única vez y reintenta la petición. Si el
 * token nuevo tampoco vale, el error se propaga al componente.
 */
http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._authRetry) {
      return Promise.reject(error)
    }

    originalRequest._authRetry = true
    const token = await refreshToken()
    originalRequest.headers.set("Authorization", `Bearer ${token}`)

    return http.request(originalRequest)
  }
)

/* Detecta si un error proviene de una petición cancelada mediante AbortController */
export const isCanceledError = (error: unknown): boolean =>
  axios.isCancel(error) || (error instanceof Error && error.name === "CanceledError")

/* Detecta un 404 del backend (por ejemplo, un juego sin reseñas) */
export const isNotFoundError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404
