import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './app/App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/utilities.css'
import './styles/portal/layout.css'
import './styles/portal/content.css'
import './styles/portal/invoices.css'
import './styles/portal/payments.css'
import './styles/portal/forms.css'
import './styles/portal/addons.css'
import './styles/portal/responsive.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Simpan slug ke localStorage jika ada di URL (?slug=xxx) sebelum router bekerja
const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('slug');
if (slug) {
  localStorage.setItem('tenant_slug', slug);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
