import React from 'react'
import ReactDOM from 'react-dom/client'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { OverlayProvider } from 'overlay-kit'

import { App } from './app/App'

ReactDOM.createRoot(document.querySelector('#app') as HTMLElement).render(
  <React.StrictMode>
    <NuqsAdapter>
      <OverlayProvider>
        <App />
      </OverlayProvider>
    </NuqsAdapter>
  </React.StrictMode>,
)
