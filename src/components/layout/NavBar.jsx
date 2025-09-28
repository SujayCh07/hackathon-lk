import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { UserCircleIcon } from '@heroicons/react/24/outline'; // Account icon

const authenticatedLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/planner', label: 'GeoBudget' },
  { to: '/insights', label: 'Smart-Spend' },
  { to: '/settings', label: 'Settings' }
];

const linkClasses =
  'rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red';

export function NavBar() {
  const navigate = useNavigate();
  const { user, signOut, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('ppp-theme') ?? 'light';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ppp-theme', theme);
    }
  }, [theme]);

  const links = user ? authenticatedLinks : [];

  const identityLabel = useMemo(() => {
    const metadata = user?.user_metadata ?? {};
    return (
      metadata.displayName?.trim() ||
      metadata.name?.trim() ||
      [metadata.first_name, metadata.last_name].filter(Boolean).join(' ').trim() ||
      user?.email ||
      'Account'
    );
  }, [user]);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut();
      navigate('/', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50">
      {/* 🔹 FDIC Insured Banner */}
      <div className="w-full bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl flex items-center justify-center px-4 py-2">
          <div className="flex items-center gap-1">
            {/* FDIC wordmark */}
            <span
              className="text-lg font-black text-blue-900 tracking-tight"
              style={{ fontFamily: 'Arial Black, sans-serif' }}
            >
              FDIC
            </span>
            {/* Tagline */}
            <span
              className="text-xs italic text-gray-700 ml-1"
              style={{ fontStyle: 'italic' }}
            >
              FDIC-Insured - Backed by the full faith and credit of the U.S. Government
            </span>
          </div>
        </div>
      </div>

      {/* 🔹 Main Nav */}
      <nav className="w-full bg-white/95 shadow-md shadow-slate-100/50 backdrop-blur">
        <div
          className="mx-auto flex max-w-7xl items-center justify-between px-8 py-3 text-navy"
          aria-label="Primary"
        >
          {/* Logo + Wordmark */}
          <NavLink to="/" className="flex items-center gap-3">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-red to-navy bg-clip-text text-transparent">
              Parity
            </span>
          </NavLink>

          {/* Nav Links */}
          <div className="hidden items-center gap-10 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${linkClasses} ${
                    isActive
                      ? 'bg-red text-white shadow-sm'
                      : 'text-navy/70 hover:text-navy hover:bg-navy/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Account Section */}
          <div className="hidden items-center gap-5 md:flex border-l border-slate/200 pl-6">
            {user ? (
              <>
                <NavLink
                  to="/settings"
                  className="flex items-center gap-2 text-sm font-semibold text-navy/80 hover:text-navy"
                >
                  <UserCircleIcon className="h-6 w-6 text-navy/70" />
                  <span>{identityLabel}</span>
                </NavLink>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-5 py-2 text-sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut || isLoading}
                >
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={NavLink}
                  to="/login"
                  variant="secondary"
                  className="px-5 py-2 text-sm"
                >
                  Log in
                </Button>
                <Button
                  as={NavLink}
                  to="/signup"
                  className="border border-red/10 bg-gradient-to-r from-red to-navy px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-red/90 hover:to-navy/90"
                >
                  Sign up
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <details className="relative md:hidden" role="list">
            <summary className="list-none rounded-full border border-navy/20 px-4 py-2 text-sm font-semibold text-navy/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red">
              Menu
            </summary>
            <div className="absolute right-0 mt-3 w-48 rounded-3xl border border-navy/10 bg-white/95 p-4 shadow-xl shadow-navy/10">
              <ul className="space-y-2" role="list">
                {links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) =>
                        `${linkClasses} block text-sm ${
                          isActive
                            ? 'bg-red text-white shadow-sm'
                            : 'text-navy/70 hover:text-navy hover:bg-navy/5'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
                <li className="pt-3">
                  {user ? (
                    <div className="space-y-2">
                      <NavLink
                        to="/settings"
                        className="flex items-center gap-2 text-sm font-semibold text-navy/70 hover:text-navy"
                      >
                        <UserCircleIcon className="h-5 w-5 text-navy/70" />
                        <span>{identityLabel}</span>
                      </NavLink>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full text-sm"
                        onClick={handleSignOut}
                        disabled={isSigningOut || isLoading}
                      >
                        {isSigningOut ? 'Signing out…' : 'Sign out'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        as={NavLink}
                        to="/login"
                        variant="secondary"
                        className="w-full text-sm"
                      >
                        Log in
                      </Button>
                      <Button
                        as={NavLink}
                        to="/signup"
                        className="w-full border border-red/10 bg-gradient-to-r from-red to-navy text-sm font-semibold text-white shadow-sm transition hover:from-red/90 hover:to-navy/90"
                      >
                        Sign up
                      </Button>
                    </div>
                  )}
                </li>
              </ul>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
