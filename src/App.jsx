import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import OperationsDashboard from './pages/OperationsDashboard';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import TaskPage from './pages/TaskPage';
import TeamPage from './pages/TeamPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DocsPage from './pages/DocsPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Component to handle smooth route transition progress bar
function RouteNavigationLoader() {
  const location = useLocation();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setNavigating(true);
    const timer = setTimeout(() => {
      setNavigating(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!navigating) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        backgroundColor: '#3B82F6',
        zIndex: 9999,
        animation: 'routeProgress 0.4s ease-in-out'
      }}
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root Route: Always renders SignInPage when loading the app */}
      <Route path='/' element={<SignInPage />} />
      <Route path='/signin' element={<SignInPage />} />
      <Route path='/signup' element={<SignUpPage />} />
      <Route path='/verify-email' element={<VerifyEmailPage />} />

      {/* Protected Dashboard Routes */}
      <Route 
        path='/dashboard' 
        element={
          <ProtectedRoute>
            <OperationsDashboard/>
          </ProtectedRoute>
        }
      />
      <Route 
        path='/task' 
        element={
          <ProtectedRoute>
            <TaskPage/>
          </ProtectedRoute>
        }
      />
      <Route 
        path='/team' 
        element={
          <ProtectedRoute>
            <TeamPage/>
          </ProtectedRoute>
        }
      />
      <Route 
        path='/analytics' 
        element={
          <ProtectedRoute>
            <AnalyticsPage/>
          </ProtectedRoute>
        }
      />
      <Route 
        path='/documents' 
        element={
          <ProtectedRoute>
            <DocsPage/>
          </ProtectedRoute>
        }
      />
      <Route 
        path='/settings' 
        element={
          <ProtectedRoute>
            <SettingsPage/>
          </ProtectedRoute>
        }
      />

      {/* Fallback Catch-all Route */}
      <Route path='*' element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      {/* INITIAL FULLSCREEN BRAND PRELOADER */}
      {loading && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: '#0F172A',
            color: '#F1F5F9',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: fadeOut ? 'none' : 'all',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          }}
        >
          {/* Logo Badge */}
          <div 
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#3B82F6',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '22px',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
              marginBottom: '20px',
              animation: 'pulseLogo 1.5s infinite ease-in-out'
            }}
          >
            OP
          </div>

          <h5 className="fw-bold mb-1" style={{ letterSpacing: '-0.02em', color: '#F1F5F9' }}>
            OpsPortal
          </h5>
          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '28px' }}>
            Initializing system engine...
          </p>

          {/* Spinner Ring */}
          <div 
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#3B82F6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
        </div>
      )}

      {/* ROUTER & ROUTE LIST */}
      <BrowserRouter>
        <RouteNavigationLoader />
        <AppRoutes />
      </BrowserRouter>

      {/* GLOBAL PRELOADER ANIMATIONS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulseLogo {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }

        @keyframes routeProgress {
          0% { width: 0%; opacity: 1; }
          70% { width: 80%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
      `}</style>
    </AuthProvider>
  );
}

export default App;