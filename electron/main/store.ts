/**
 * store.ts — Almacén de persistencia para el historial
 *
 * Gestiona el historial de grabaciones de video usando un archivo JSON
 * simple en lugar de una base de datos. Los datos se almacenan en:
 * %APPDATA%/Viwe/viwe-data.json
 *
 * Ventajas sobre electron-store:
 * - Sin dependencias externas
 * - Compatible con CJS (electron-store v9+ es ESM-only)
 * - Totalmente controlado y debuggeable
 */

import fs from 'fs'
import path from 'path'
import { app } from 'electron'

/** Estructura de una entrada en el historial */
interface HistoryEntry {
  id: string        // ID único (timestamp + random)
  url: string       // URL original que se grabó
  domain: string    // Dominio extraído de la URL (ej: youtube.com)
  title: string     // Título de la página grabada
  filePath: string  // Ruta completa del archivo MP4 generado
  date: string      // Fecha de la grabación formateada
}

/** Estructura del archivo JSON de datos */
interface StoreData {
  history: HistoryEntry[]
}

/**
 * Obtiene la ruta completa del archivo de datos.
 * En desarrollo: %APPDATA%/Viwe/viwe-data.json
 * En producción: misma ubicación (app.getPath('userData'))
 */
function getStorePath(): string {
  const dir = app.getPath('userData')
  return path.join(dir, 'viwe-data.json')
}

/**
 * Lee el archivo de datos y retorna el contenido parseado.
 * Si el archivo no existe o está corrupto, retorna un historial vacío.
 */
function readStore(): StoreData {
  const storePath = getStorePath()
  if (!fs.existsSync(storePath)) {
    return { history: [] }
  }
  try {
    const raw = fs.readFileSync(storePath, 'utf-8')
    return JSON.parse(raw) as StoreData
  } catch {
    return { history: [] }
  }
}

/**
 * Escribe el contenido del store al archivo JSON.
 * Crea el directorio si no existe.
 */
function writeStore(data: StoreData): void {
  const storePath = getStorePath()
  const dir = path.dirname(storePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Obtiene todas las entradas del historial.
 * Las entradas más recientes primero.
 */
export function getHistory(): HistoryEntry[] {
  return readStore().history
}

/**
 * Agrega una nueva entrada al historial.
 * Se inserta al inicio (más reciente primero).
 *
 * @param item - Datos de la grabación a guardar
 */
export function addToHistory(item: { url: string; domain: string; title: string; filePath: string }): void {
  const data = readStore()
  const now = new Date()

  // Formato de fecha legible en español
  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })

  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: item.url,
    domain: item.domain,
    title: item.title,
    filePath: item.filePath,
    date: dateStr
  }

  data.history = [entry, ...data.history]
  writeStore(data)
}

/**
 * Elimina una entrada del historial por su ID.
 *
 * @param id - ID de la entrada a eliminar
 */
export function deleteFromHistory(id: string): void {
  const data = readStore()
  data.history = data.history.filter((item) => item.id !== id)
  writeStore(data)
}
