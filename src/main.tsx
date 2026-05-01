import React from 'react'
import ReactDOM from 'react-dom/client'
import { NuqsAdapter } from 'nuqs/adapters/react'

import { App } from './app/App'
import './style.css'

ReactDOM.createRoot(document.querySelector('#app') as HTMLElement).render(
  <React.StrictMode>
    <NuqsAdapter>
      <App />
    </NuqsAdapter>
  </React.StrictMode>,
)
