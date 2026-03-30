import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

const UPLOAD_URL = import.meta.env.VITE_DXF_UPLOAD_URL ?? 'http://localhost:4000/upload'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function DxfUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [responseData, setResponseData] = useState<unknown>(null)
  const [isDragging, setIsDragging] = useState(false)

  const reset = useCallback(() => {
    setFile(null)
    setStatus('idle')
    setError(null)
    setResponseData(null)
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0]
    if (chosen) {
      if (!chosen.name.toLowerCase().endsWith('.dxf')) {
        setError('Please select a .dxf file.')
        setFile(null)
        return
      }
      setFile(chosen)
      setError(null)
      setStatus('idle')
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = e.dataTransfer.files?.[0]
      if (!dropped) return
      if (!dropped.name.toLowerCase().endsWith('.dxf')) {
        setError('Please drop a .dxf file.')
        setFile(null)
        return
      }
      setFile(dropped)
      setError(null)
      setStatus('idle')
    },
    []
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setStatus('uploading')
    setError(null)
    setResponseData(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('filename', file.name)

    try {
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
          // Let browser set Content-Type with boundary for FormData
        },
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Upload failed: ${res.status} ${res.statusText}`)
      }

      const data = await res.json().catch(() => null)
      setResponseData(data)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }, [file])

  const handleReset = useCallback(() => {
    reset()
  }, [reset])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Upload DXF (CAD)</h1>
        <p>Select or drop a .dxf file to send to the backend.</p>
      </header>

      <div className="dxf-upload-section">
        <div
          className={`dxf-dropzone ${isDragging ? 'dxf-dropzone--active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept=".dxf"
            onChange={handleFileChange}
            className="dxf-input"
            id="dxf-file-input"
          />
          <label htmlFor="dxf-file-input" className="dxf-dropzone-label">
            {file ? (
              <span className="dxf-filename">{file.name}</span>
            ) : (
              <>Click to choose or drag a .dxf file here</>
            )}
          </label>
        </div>

        <div className="dxf-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleUpload}
            disabled={!file || status === 'uploading'}
          >
            {status === 'uploading' ? 'Uploading…' : 'Upload to backend'}
          </button>
          {(file || status !== 'idle') && (
            <button type="button" className="secondary-button dxf-reset" onClick={handleReset}>
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="dxf-message dxf-message--error" role="alert">
            {error}
          </div>
        )}

        {status === 'success' && (
          <div className="dxf-message dxf-message--success">
            Upload successful.
            {responseData != null && (
              <pre className="dxf-response">{JSON.stringify(responseData, null, 2)}</pre>
            )}
          </div>
        )}
      </div>

      <p className="dxf-back">
        <Link to="/">← Back to home</Link>
      </p>
    </div>
  )
}
