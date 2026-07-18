import { useState } from 'react'
import Layout from './components/Layout'
import URLInput from './components/URLInput'
import HistoryList from './components/HistoryList'
import VideoPlayer from './components/VideoPlayer'
import ProgressBar from './components/ProgressBar'
import { useDownload } from './hooks/useDownload'
import type { HistoryItem } from './types'

export default function App(): JSX.Element {
  const [url, setUrl] = useState('')
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const { downloadState, history, startDownload, openFolder, openFile } = useDownload()

  const handleGenerate = async (): Promise<void> => {
    if (!url.trim()) return
    await startDownload(url)
    setUrl('')
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
        disabled={downloadState.status === 'downloading'}
      />

      {/* Progress bar */}
      {downloadState.status === 'downloading' && (
        <div className="mt-4">
          <ProgressBar
            percent={downloadState.progress.percent}
            speed={downloadState.progress.speed}
            eta={downloadState.progress.eta}
          />
        </div>
      )}

      {/* Error message */}
      {downloadState.status === 'error' && downloadState.error && (
        <div className="mt-4 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-error text-sm">
          {downloadState.error}
        </div>
      )}

      {/* Success message */}
      {downloadState.status === 'done' && (
        <div className="mt-4 px-4 py-3 bg-success/10 border border-success/30 rounded-xl text-success text-sm">
          Video descargado correctamente
        </div>
      )}

      {/* Main content: History + Preview */}
      <div className="flex-1 flex gap-6 mt-6 overflow-hidden">
        {/* History list */}
        <div className="flex-1 overflow-hidden">
          <HistoryList
            items={history}
            selectedId={selectedItem?.id ?? null}
            onSelect={setSelectedItem}
            onOpenFolder={(filePath) => openFile(filePath)}
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
