import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import 'mxcad-app/style'
import { MxCADView, mxcadApp } from 'mxcad-app'

/**
 * MxCAD App integration (see mxcad-app README):
 * - `mxcad-app/style` + `MxCADView` + `mxcadAssetsPlugin` in vite.config.ts
 * - Custom host via `rootContainer` (React ref); optional `openFile` URL
 *
 * Your responsibilities (not automatic):
 * - License / compliance: package uses a custom license — review before production.
 * - Upload/save/print: `mxServerConfig` defaults target localhost backends — set real URLs
 *   via `transformMxServerConfig` in vite (or vendor config) when you have an API.
 * - Optional CDN: `mxcadApp.setStaticAssetPath('https://…/mxcadAppAssets')` before `create()`
 *   if you do not serve assets from the app origin.
 * - Default sample `test.mxweb` from README is not bundled in npm; add `.mxweb`/`.dwg`/`.dxf`
 *   under `public/` and set `VITE_MXCAD_OPEN_FILE` (see `.env.example`).
 * - AI chat: needs `VITE_OPENROUTER_API_KEY` per upstream README if you enable that feature.
 * - `libraryNames: ['vue']` in the plugin only if *your* code imports `vue` alongside mxcad-app.
 * - Advanced automation: use `mxcad` / `mxdraw` APIs after the view is created (see vendor docs).
 */
function resolveInitialDrawingUrl(): string | undefined {
  const raw = import.meta.env.VITE_MXCAD_OPEN_FILE as string | undefined
  if (!raw?.trim()) return undefined
  const t = raw.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const path = t.startsWith('/') ? t : `${base}/${t}`.replace(/\/{2,}/g, '/')
  return new URL(path, window.location.origin).href
}

export function MxCadAppPage() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const openFile = resolveInitialDrawingUrl()
    /**
     * Docs also show:
     * `openFile: new URL('test.mxweb', mxcadApp.getStaticAssetPath()).toString()`
     * That file is not shipped in the npm package; use `public/` + env instead.
     */
    const assetBase = (import.meta.env.VITE_MXCAD_ASSET_BASE as string | undefined)?.trim()
    if (assetBase) mxcadApp.setStaticAssetPath(assetBase.replace(/\/$/, ''))

    const view = new MxCADView({
      rootContainer: el,
      ...(openFile ? { openFile } : {}),
    })
    view.create()

    return () => {
      try {
        view.getVueApp()?.unmount()
      } catch {
        /* best-effort teardown */
      }
      el.replaceChildren()
    }
  }, [])

  return (
    <div className="mxcad-app-page">
      <Link to="/" className="mxcad-app-home-link">
          Home
      </Link>
      <div
        ref={hostRef}
        className="mxcad-app-page-host"
        aria-label="MxCAD drawing surface"
      />
    </div>
  )
}
