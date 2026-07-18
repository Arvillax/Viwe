import { useState } from 'react'
import Layout from './components/Layout'
import URLInput from './components/URLInput'

export default function App(): JSX.Element {
  const [url, setUrl] = useState('')

  const handleGenerate = (): void => {
    if (!url.trim()) return
    console.log('Generate:', url)
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
    </Layout>
  )
}
