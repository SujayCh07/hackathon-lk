import { Route, Routes, useLocation } from 'react-router-dom';
import NavBar from './components/layout/NavBar.jsx';
import Footer from './components/layout/Footer.jsx';
import RouteTransitions from './components/layout/RouteTransitions.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Planner from './pages/Planner.jsx';
import Insights from './pages/Insights.jsx';
import Share from './pages/Share.jsx';

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-offwhite text-charcoal">
      <NavBar />
      <RouteTransitions key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/share" element={<Share />} />
        </Routes>
      </RouteTransitions>
      <Footer />
    </div>
  );
}

export default App;
