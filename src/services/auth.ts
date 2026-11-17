import axios from "axios"

import { environment } from "../config/environment"

/**
 * Respuesta de `POST /api/auth/login` (mismo contrato que backend-node20).
 */
export interface LoginResponse {
  token: string
  tokenType?: string
  expiresAt?: string
}

/** Token JWT persistido en el navegador. */
interface StoredToken {
  token: string
  expiresAt: number
}

/** Clave de `localStorage` donde se cachea el JWT del catálogo. */
export const AUTH_TOKEN_STORAGE_KEY = "spentpark-catalog-token"

/** Se renueva el token un minuto antes de que caduque. */
export const TOKEN_EXPIRY_MARGIN_MS = 60_000

/** Vida por defecto si el login no devuelve `expiresAt` (el backend firma 1 h). */
export const DEFAULT_TOKEN_TTL_MS = 60 * 60 * 1000

/** Ruta del login dentro de la API (`environment.apiUrl` ya incluye `/api`). */
export const LOGIN_PATH = "/auth/login"

/**
 * Cliente HTTP propio para el login: no usa la instancia compartida `http` para
 * no crear una dependencia circular con los interceptores.
 */
const loginClient = axios.create({
  baseURL: environment.apiUrl,
  headers: {
    "Content-Type": "application/json"
  }
})

let currentToken: StoredToken | null = null
let loginPromise: Promise<string> | null = null

/** Convierte la fecha de caducidad ISO del backend a milisegundos. */
function parseExpiry(expiresAt: string | undefined): number | null {
  if (!expiresAt) {
    return null
  }

  const time = Date.parse(expiresAt)
  return Number.isNaN(time) ? null : time
}

/** `true` si hay token y aún no está dentro del margen de caducidad. */
function hasValidToken(stored: StoredToken | null): boolean {
  return stored !== null && Date.now() < stored.expiresAt - TOKEN_EXPIRY_MARGIN_MS
}

/** Recupera un token cacheado de una carga anterior de la página. */
function readStoredToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<StoredToken>
    if (typeof parsed.token === "string" && typeof parsed.expiresAt === "number") {
      return { token: parsed.token, expiresAt: parsed.expiresAt }
    }
  } catch {
    /* JSON corrupto o `localStorage` no disponible: se pedirá un token nuevo. */
  }

  return null
}

function storeToken(stored: StoredToken): void {
  currentToken = stored

  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    /* Sin almacenamiento disponible (modo privado/cuota): queda en memoria. */
  }
}

function clearToken(): void {
  currentToken = null

  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  } catch {
    /* Sin almacenamiento disponible: no hay nada que limpiar. */
  }
}

/** `true` si la API devolvió el error definitivo de credenciales. */
function isInvalidCredentials(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}

async function requestToken(username: string, password: string): Promise<string> {
  const response = await loginClient.post<LoginResponse>(LOGIN_PATH, { username, password })
  const token = response.data?.token

  if (!token) {
    throw new Error("El servicio de autenticación no devolvió un token")
  }

  const expiresAt = parseExpiry(response.data.expiresAt) ?? Date.now() + DEFAULT_TOKEN_TTL_MS
  storeToken({ token, expiresAt })

  return token
}

/**
 * Pide un token nuevo al backend. Las peticiones concurrentes comparten la misma
 * promesa para no agotar el rate limit del login (5 intentos / 15 min por IP).
 */
function login(): Promise<string> {
  const username = environment.apiUsername
  const password = environment.apiPassword

  if (!username || !password) {
    return Promise.reject(
      new Error(
        "No hay credenciales configuradas para la API (VITE_API_USERNAME/VITE_API_PASSWORD)"
      )
    )
  }

  loginPromise ??= requestToken(username, password).finally(() => {
    loginPromise = null
  })

  return loginPromise
}

/**
 * Devuelve un JWT válido: reutiliza el cacheado (memoria o `localStorage`) y
 * solo hace login si no existe o está a punto de caducar.
 */
export const ensureToken = async (): Promise<string> => {
  const stored = currentToken ?? readStoredToken()

  if (hasValidToken(stored)) {
    currentToken = stored
    return (stored as StoredToken).token
  }

  return login()
}

/** Descarta el token actual y pide uno nuevo (por ejemplo, tras un 401). */
export const refreshToken = async (): Promise<string> => {
  clearToken()
  return login()
}

/** Descarta el token cacheado (utilidad para errores y pruebas). */
export const discardToken = (): void => {
  clearToken()
}

/** Descarta token y promesa en vuelo (solo pruebas). */
export const resetAuthState = (): void => {
  currentToken = null
  loginPromise = null
  clearToken()
}

export { isInvalidCredentials }
