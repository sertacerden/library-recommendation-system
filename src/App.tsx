import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Home } from './pages/Home';
import { Books } from './pages/Books';
import { BookDetail } from './pages/BookDetail';
import { Recommendations } from './pages/Recommendations';
import { ReadingLists } from './pages/ReadingLists';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ConfirmSignup } from './pages/ConfirmSignup';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { NotFound } from './pages/NotFound';

import { ScrollToTop } from './components/common/ScrollToTop';
import { ToastViewport } from './components/common/ToastViewport';
import { ConfirmViewport } from './components/common/ConfirmViewport';

/**
 * Main App component with routing and layout
 */
function PrelineAutoInit() {
  const location = useLocation();

  useEffect(() => {
    // Preline requires re-init after SPA route changes to bind dropdowns, etc.
    window.HSStaticMethods?.autoInit();
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <PrelineAutoInit />
        <ToastViewport />
        <ConfirmViewport />
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/books" element={<Books />} />
              <Route path="/books/:id" element={<BookDetail />} />
              <Route
                path="/recommendations"
                element={
                  <ProtectedRoute>
                    <Recommendations />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route
                path="/reading-lists"
                element={
                  <ProtectedRoute>
                    <ReadingLists />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/confirm" element={<ConfirmSignup />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
