import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Global fetch interceptor to enforce server-side RBAC headers (X-Demo-Role-View & X-Role-Persona)
// across all API calls in App and child components.
const originalFetch = window.fetch.bind(window);
(window as any).__APEX_ROLE_VIEW = 'OPS_CENTRAL';
(window as any).__APEX_PERSONA = 'ops-capacity-lead@demo.example.com';

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (urlStr.startsWith('/api/')) {
    const roleView = (window as any).__APEX_ROLE_VIEW || 'OPS_CENTRAL';
    const persona = (window as any).__APEX_PERSONA || 'ops-capacity-lead@demo.example.com';
    const headers = new Headers(init?.headers || {});
    if (!headers.has('X-Demo-Role-View')) {
      headers.set('X-Demo-Role-View', roleView);
    }
    if (!headers.has('X-Role-Persona')) {
      headers.set('X-Role-Persona', persona);
    }
    return originalFetch(input, { ...init, headers });
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
