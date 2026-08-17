import axios from 'axios'
import { environment } from '../config/environment'

export const http = axios.create({
  baseURL: environment.apiUrl,
  headers: { 'Content-Type': 'application/json' }
})
