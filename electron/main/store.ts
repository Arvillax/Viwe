import fs from 'fs'
import path from 'path'
import { app } from 'electron'

interface HistoryEntry {
  id: string
  url: string
  domain: string
  title: string
  filePath: string
  date: string
}

interface StoreData {
  history: HistoryEntry[]
}

function getStorePath(): string {
  const dir = app.getPath('userData')
  return path.join(dir, 'viwe-data.json')
}

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

function writeStore(data: StoreData): void {
  const storePath = getStorePath()
  const dir = path.dirname(storePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function getHistory(): HistoryEntry[] {
  return readStore().history
}

export function addToHistory(item: { url: string; domain: string; title: string; filePath: string }): void {
  const data = readStore()
  const now = new Date()
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

export function deleteFromHistory(id: string): void {
  const data = readStore()
  data.history = data.history.filter((item) => item.id !== id)
  writeStore(data)
}
