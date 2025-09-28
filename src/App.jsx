import { useEffect } from 'react';
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
import DemoConsole from './pages/DemoConsole.jsx';
import DemoAdminStatus from './pages/DemoAdminStatus.jsx';

function App() {
  const location = useLocation();
  const { refreshSession } = useAuth();

  useEffect(() => {
    if (!refreshSession) return;
    refreshSession().catch((error) => {
      console.warn('Failed to refresh auth session on navigation', error);
    });
  }, [location.key, refreshSession]);

  const transitionKey = `${location.key ?? 'root'}:${location.pathname}${location.search}${location.hash}`;
  return (
    <div className="relative min-h-screen overflow-hidden text-charcoal">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-navy/40 via-sky/20 to-transparent blur-3xl" />
        <div className="absolute right-[-18%] top-[12%] h-[22rem] w-[22rem] rounded-full bg-gradient-to-br from-red/40 via-red/10 to-transparent blur-3xl" />
        <div className="absolute left-[20%] bottom-[-18%] h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-turquoise/35 via-teal/20 to-transparent blur-3xl" />
        <div className="absolute inset-x-0 bottom-[-20%] h-[18rem] bg-gradient-to-t from-navy/15 via-transparent to-transparent blur-3xl" />
      </div>
      <NavBar />
      <RouteTransitions transitionKey={transitionKey}>
        <Routes location={location} key={transitionKey}>
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
          <Route
            path="/demo/nessie"
            element={<DemoConsole />}
          />
          <Route
            path="/demo/admin"
            element={<DemoAdminStatus />}
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

