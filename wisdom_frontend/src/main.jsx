import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TableProvider } from './context/TableContext.jsx'
import { BdtsProvider } from './context/BdtsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BdtsProvider>
      <TableProvider>
        <App />
      </TableProvider>
    </BdtsProvider>
  </StrictMode>,
)
