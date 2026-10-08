import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Força o redirecionamento dos links antigos para o novo domínio
const allowedHosts = ['localhost', '127.0.0.1', 'raiuva.com.br', 'www.raiuva.com.br'];
if (!allowedHosts.includes(window.location.hostname)) {
  window.location.replace('https://raiuva.com.br' + window.location.pathname + window.location.search);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


