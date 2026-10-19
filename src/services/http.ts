import axios from "axios"
import { environment } from "../config/environment"

export const http = axios.create({
  baseURL: environment.apiUrl,
  headers: {
    "Content-Type": "application/json"
  }
})

/* Detecta si un error proviene de una petición cancelada mediante AbortController */
export const isCanceledError = (error: unknown): boolean =>
  axios.isCancel(error) || (error instanceof Error && error.name === "CanceledError")

/* Detecta un 404 del backend (por ejemplo, un juego sin reseñas) */
export const isNotFoundError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404
