import { useState } from 'react'
import Layout from './components/Layout'
import URLInput from './components/URLInput'
import HistoryList from './components/HistoryList'
import VideoPlayer from './components/VideoPlayer'
import type { HistoryItem } from './types'

// Mock data for UI preview
const MOCK_HISTORY: HistoryItem[] = [
  { id: '1', url: 'https://anthropic.com', domain: 'anthropic.com', title: 'Anthropic', filePath: '', date: 'Hoy, 10:24' },
  { id: '2', url: 'https://github.com/explore', domain: 'github.com/explore', title: 'GitHub Explore', filePath: '', date: 'Ayer, 18:02' },
  { id: '3', url: 'https://wikipedia.org', domain: 'wikipedia.org', title: 'Wikipedia', filePath: '', date: 'Lun, 09:15' },
]

export default function App(): JSX.Element {
  const [url, setUrl] = useState('')
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)

  const handleGenerate = (): void => {
    if (!url.trim()) return
    console.log('Generate:', url)
  }

  const handleOpenFolder = (filePath: string): void => {
    console.log('Open folder:', filePath)
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-accent tracking-tight">Viwe</h1>
      </div>

      {/* URL Input */}
      <URLInput
        value={url}
        onChange={setUrl}
        onSubmit={handleGenerate}
      />

      {/* Main content: History + Preview */}
      <div className="flex-1 flex gap-6 mt-6 overflow-hidden">
        {/* History list */}
        <div className="flex-1 overflow-hidden">
          <HistoryList
            items={MOCK_HISTORY}
            selectedId={selectedItem?.id ?? null}
            onSelect={setSelectedItem}
            onOpenFolder={handleOpenFolder}
          />
        </div>

        {/* Video preview */}
        <div className="w-[340px] flex-shrink-0">
          <VideoPlayer item={selectedItem} />
        </div>
      </div>
    </Layout>
  )
}
