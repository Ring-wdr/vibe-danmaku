import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './app/App'
import './style.css'

ReactDOM.createRoot(document.querySelector('#app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
