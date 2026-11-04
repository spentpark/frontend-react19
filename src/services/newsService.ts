import type { Pagination } from "./gameService"
import { environment } from "../config/environment"
import { http } from "./http"

/**
 * Noticia de videojuegos tal como la devuelve el servicio `rss-game-node`
 * (`GET /api/game-news`).
 *
 * El backend real usa `_id`, `source`, `title`, `url`, `description` (HTML) y
 * `published_at`. Se aceptan además nombres alternativos por compatibilidad
 * (`id`, `image`/`imageUrl`/`urlToImage`, `date`, etc.); la normalización a la
 * vista se hace en `unwrapNewsPage` / `toNewsItem`.
 */
export interface GameNews {
  _id?: string
  id?: number | string
  source?: string | { name?: string }
  author?: string
  title?: string
  description?: string
  summary?: string
  content?: string
  url?: string
  link?: string
  image?: string
  imageUrl?: string
  urlToImage?: string
  feed_url?: string
  guid?: string
  published_at?: string | null
  publishedAt?: string
  date?: string
  fetched_at?: string
}

/**
 * Página de noticias ya normalizada. El servicio acepta además respuestas con
 * `news`, `articles` o `items`, y arrays planos (se paginan en cliente).
 */
export interface GameNewsPage {
  data: GameNews[]
  pagination: Pagination
}

/** Noticia normalizada, lista para pintarse en la vista. */
export interface GameNewsItem {
  id: number | string
  title: string
  summary: string
  imageUrl: string | null
  url: string | null
  source: string
  publishedAt: string
}

/** Noticias por página que se piden al servicio. */
export const NEWS_PAGE_SIZE = 10

/**
 * URL del listado de noticias. Vive en el backend `rss-game-node` (puerto 3001
 * en desarrollo), distinto del backend del catálogo; el JWT es válido en ambos
 * porque comparten secreto, `issuer` y `audience`.
 */
export const NEWS_BASE_URL = `${environment.newsApiUrl}/game-news`

/** Página vacía de noticias: valor por defecto mientras carga o si falla la petición. */
export const EMPTY_NEWS_PAGE: GameNewsPage = {
  data: [],
  pagination: {
    currentPage: 1,
    perPage: NEWS_PAGE_SIZE,
    totalRecords: 0,
    totalPages: 0
  }
}

/** Envoltura cruda que puede devolver el servicio. */
interface RawNewsPage {
  data?: GameNews[]
  news?: GameNews[]
  articles?: GameNews[]
  items?: GameNews[]
  pagination?: Partial<Pagination>
  page?: number
  limit?: number
  total?: number
  totalPages?: number
}

/** Primera lista presente de las que puede devolver el servicio. */
function firstArray(...candidates: (GameNews[] | undefined)[]): GameNews[] | undefined {
  return candidates.find((candidate) => Array.isArray(candidate))
}

/**
 * Pagina en cliente una lista completa: se usa cuando el servicio devuelve un
 * array plano (o `{ data: [...] }` sin metadatos) en lugar de una página.
 */
function paginateInClient(data: GameNews[], page: number, limit: number): GameNewsPage {
  const safeLimit = limit > 0 ? limit : NEWS_PAGE_SIZE
  const totalPages = Math.ceil(data.length / safeLimit)
  const currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1))
  const start = (currentPage - 1) * safeLimit

  return {
    data: data.slice(start, start + safeLimit),
    pagination: {
      currentPage,
      perPage: safeLimit,
      totalRecords: data.length,
      totalPages
    }
  }
}

/**
 * Normaliza la respuesta del servicio `game-news`. Acepta:
 *
 * - El contrato paginado `{ data, pagination }` (y sus alias `news`,
 *   `articles` o `items`), con o sin metadatos de paginación.
 * - Un array plano con todas las noticias, que se pagina en cliente.
 */
export function unwrapNewsPage(raw: unknown, page = 1, limit = NEWS_PAGE_SIZE): GameNewsPage {
  if (Array.isArray(raw)) {
    return paginateInClient(raw as GameNews[], page, limit)
  }

  const wrapped = (raw ?? {}) as RawNewsPage
  const data = firstArray(wrapped.data, wrapped.news, wrapped.articles, wrapped.items) ?? []
  const hasPaginationMetadata =
    wrapped.pagination !== undefined ||
    wrapped.page !== undefined ||
    wrapped.limit !== undefined ||
    wrapped.total !== undefined ||
    wrapped.totalPages !== undefined

  /* Sin metadatos, la lista se interpreta como la colección completa. */
  if (!hasPaginationMetadata) {
    return paginateInClient(data, page, limit)
  }

  const pagination = wrapped.pagination ?? {}
  const perPage = pagination.perPage ?? wrapped.limit ?? (limit > 0 ? limit : NEWS_PAGE_SIZE)
  const totalRecords = pagination.totalRecords ?? wrapped.total ?? data.length
  const totalPages =
    pagination.totalPages ??
    wrapped.totalPages ??
    (perPage > 0 ? Math.ceil(totalRecords / perPage) : 0)

  return {
    data,
    pagination: {
      currentPage: pagination.currentPage ?? wrapped.page ?? page,
      perPage,
      totalRecords,
      totalPages
    }
  }
}

/** Texto limpio (sin espacios sobrantes) o cadena vacía. */
function text(value: string | undefined | null): string {
  return (value ?? "").trim()
}

/**
 * Convierte el HTML del feed RSS en texto plano para el resumen de la tarjeta.
 * El HTML nunca se inyecta en el DOM: se eliminan las etiquetas y se decodifican
 * las entidades más habituales.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/** Extrae la URL de la primera imagen del HTML del feed, si la hay. */
export function extractFirstImage(value: string): string | null {
  const match = value.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match ? match[1].trim() : null
}

/**
 * Formatea una fecha ISO para mostrarla. Si la fecha no es válida se devuelve
 * el valor original; se usa UTC para que el render sea determinista.
 */
export function formatNewsDate(value: string): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date)
}

/** Normaliza una noticia del servicio a la forma que pinta la vista. */
export function toNewsItem(news: GameNews, index: number): GameNewsItem {
  const source =
    typeof news.source === "string"
      ? text(news.source)
      : text(news.source?.name) || text(news.author)

  const description = text(news.description)
  const summarySource = description || text(news.summary) || text(news.content)

  return {
    id: news._id ?? news.id ?? `news-${index}`,
    title: text(news.title) || "Noticia sin título",
    summary: stripHtml(summarySource),
    imageUrl:
      text(news.imageUrl) ||
      text(news.image) ||
      text(news.urlToImage) ||
      extractFirstImage(description),
    url: text(news.url) || text(news.link) || null,
    source,
    publishedAt: formatNewsDate(
      text(news.published_at) || text(news.publishedAt) || text(news.date)
    )
  }
}

/**
 * Descarga una página de noticias del backend `rss-game-node`.
 *
 * La petición se hace con la instancia `http` compartida (URL absoluta al
 * servicio de noticias), así que el interceptor añade el `Bearer` y renueva el
 * token una vez si el backend responde `401`.
 */
export const fetchNewsPage = async (
  page: number,
  limit: number = NEWS_PAGE_SIZE,
  signal?: AbortSignal
): Promise<GameNewsPage> => {
  const response = await http.get<unknown>(NEWS_BASE_URL, {
    params: { page, limit },
    signal
  })

  return unwrapNewsPage(response.data, page, limit)
}
