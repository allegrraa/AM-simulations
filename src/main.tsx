import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { PageMotion } from './components/PageMotion'
import 'lenis/dist/lenis.css'
import './styles.css'
import './art-direction.css'
import './polish.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000 },
    mutations: { retry: 0 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <PageMotion />
    </QueryClientProvider>
  </StrictMode>,
)
