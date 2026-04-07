import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { FloorPlan3D } from './FloorPlan3D'
import { DxfUpload } from './DxfUpload'
import { DesignerPage } from './DesignerPage'
import { CadViewPage } from './CadViewPage'
import { DxfJsonViewPage } from './DxfJsonViewPage'
import { MxCadAppPage } from './MxCadAppPage'
import './App.css'

function Home() {
  return (
    <div className="home">
      <h1>Test Konva 2D</h1>
      <p>This is your home page. Use the buttons below to open the 2D or 3D floor plan.</p>
      <div className="button-row">
        <Link to="/3D-Preview" className="secondary-button">
          Open 3D Preview
        </Link>
        <Link to="/dxf-upload" className="secondary-button">
          Upload DXF (CAD)
        </Link>
        <Link to="/designer" className="secondary-button">
          2D Editor (Advanced)
        </Link>
        <Link to="/cad-view" className="secondary-button">
          CAD view (DXF)
        </Link>
        <Link to="/dxf-json-view" className="secondary-button">
          DXF JSON Viewer
        </Link>
        <Link to="/mxcad-app" className="secondary-button">
          MxCAD App
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/3D-Preview" element={<FloorPlan3D />} />
        <Route path="/dxf-upload" element={<DxfUpload />} />
        <Route path="/designer" element={<DesignerPage />} />
        <Route path="/cad-view" element={<CadViewPage />} />
        <Route path="/dxf-json-view" element={<DxfJsonViewPage />} />
        <Route path="/mxcad-app" element={<MxCadAppPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
