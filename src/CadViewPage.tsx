import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CadViewer } from '@cadview/core'
import type { Tool } from '@cadview/core'
import { SAMPLE_DXF_LABEL, SAMPLE_DXF_STRING } from '@/constants/sampleDxf'

export function CadViewPage() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<CadViewer | null>(null)
  const [tool, setToolState] = useState<Tool>('pan')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    let viewer: CadViewer | null = null
    try {
      viewer = new CadViewer(canvas, {
        theme: 'light',
        initialTool: 'pan',
      })
      viewer.loadString(SAMPLE_DXF_STRING)
      viewer.resize()
      viewer.fitToView()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to init CAD viewer')
      return
    }

    viewerRef.current = viewer

    const ro = new ResizeObserver(() => {
      viewer?.resize()
    })
    ro.observe(wrap)

    return () => {
      ro.disconnect()
      viewerRef.current = null
      viewer?.destroy()
    }
  }, [])

  useEffect(() => {
    viewerRef.current?.setTool(tool)
  }, [tool])

  return (
    <div className="cad-view-page">
      <header className="cad-view-header">
        <div>
          <h1 className="cad-view-title">CAD view</h1>
          <p className="cad-view-sub">
            Powered by <code>@cadview/core</code> — hardcoded DXF: {SAMPLE_DXF_LABEL}
          </p>
        </div>
        <Link to="/" className="secondary-button">
          Home
        </Link>
      </header>

      <div className="cad-view-toolbar">
        <button
          type="button"
          className="secondary-button cad-view-tool"
          onClick={() => viewerRef.current?.fitToView()}
        >
          Fit to view
        </button>
        <label className="cad-view-tool-select">
          Tool:
          <select
            value={tool}
            onChange={(e) => setToolState(e.target.value as Tool)}
            aria-label="CAD tool"
          >
            <option value="pan">Pan</option>
            <option value="select">Select</option>
            <option value="measure">Measure</option>
          </select>
        </label>
      </div>

      {error ? <p className="cad-view-error">{error}</p> : null}

      <div ref={wrapRef} className="cad-view-canvas-wrap">
        <canvas ref={canvasRef} className="cad-view-canvas" />
      </div>
    </div>
  )
}
