import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import './index.css';
import 'preline';
import App from './App.tsx';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
});

// Dev-only helper for debugging auth in the browser console.
// Note: you can't `import('aws-amplify/auth')` from DevTools because the browser
// can't resolve Vite "bare module" specifiers outside the bundler.
if (import.meta.env.DEV) {
  window.__amplifyAuth = { fetchAuthSession, getCurrentUser };
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
