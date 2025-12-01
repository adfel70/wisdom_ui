import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TableProvider } from './context/TableContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TableProvider>
      <App />
    </TableProvider>
  </StrictMode>,
)
