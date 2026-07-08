import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import schema from './schema.json'
import './index.css'

const DEFAULT_MODULE =
  schema.modules.find((m) => m.name === 'PAMS')?.name || schema.modules[0]?.name || 'ALL'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/m/${DEFAULT_MODULE}`} replace />} />
        <Route path="/m/:module" element={<App />} />
        <Route path="*" element={<Navigate to={`/m/${DEFAULT_MODULE}`} replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
