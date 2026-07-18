import Store from 'electron-store'

interface HistoryEntry {
  id: string
  url: string
  domain: string
  title: string
  filePath: string
  date: string
}

const store = new Store<{ history: HistoryEntry[] }>({
  name: 'viwe-data',
  defaults: {
    history: []
  }
})

export function getHistory(): HistoryEntry[] {
  return store.get('history')
}

export function addToHistory(item: { url: string; domain: string; title: string; filePath: string }): void {
  const history = store.get('history')
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

  store.set('history', [entry, ...history])
}

export function deleteFromHistory(id: string): void {
  const history = store.get('history')
  store.set('history', history.filter((item) => item.id !== id))
}
