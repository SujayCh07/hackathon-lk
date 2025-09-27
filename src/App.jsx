import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import NavBar from './components/layout/NavBar.jsx';
import Footer from './components/layout/Footer.jsx';
import RouteTransitions from './components/layout/RouteTransitions.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Planner from './pages/Planner.jsx';
import Insights from './pages/Insights.jsx';
import Share from './pages/Share.jsx';
import Home from './pages/Home.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import Settings from './pages/Settings.jsx';
import { useAuth } from './hooks/useAuth.js';

function App() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen text-charcoal">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),rgba(255,255,255,0))]" />
      <NavBar />
      <RouteTransitions key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomeRoute />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner"
            element={
              <ProtectedRoute>
                <Planner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/share"
            element={
              <ProtectedRoute>
                <Share />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteTransitions>
      <Footer />
    </div>
  );
}

export default App;

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoader message="Checking your session" />;
  }

  if (!user) {
    const redirectTo = encodeURIComponent(
      `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
    );
    return <Navigate to={`/login?redirectTo=${redirectTo}`} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();

  if (isLoading) {
    return <FullPageLoader message="Loading" />;
  }

  if (user) {
    const redirectTo = searchParams.get('redirectTo');
    return <Navigate to={redirectTo ?? '/dashboard'} replace />;
  }

  return children;
}

function HomeRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader message="Preparing your experience" />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Home />;
}

function FullPageLoader({ message }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-charcoal/70">
      {message ?? 'Loading...'}
    </div>
  );
}
