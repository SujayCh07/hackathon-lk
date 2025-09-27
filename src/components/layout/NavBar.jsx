import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const authenticatedLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/planner', label: 'GeoBudget' },
  { to: '/insights', label: 'Smart-Spend' },
  { to: '/share', label: 'Share' }
];

const linkClasses =
  'rounded-full px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red';

export function NavBar() {
  const navigate = useNavigate();
  const { user, signOut, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const links = user ? authenticatedLinks : [];
  const identityLabel = useMemo(() => {
    const metadata = user?.user_metadata ?? {};
    return (
      metadata.displayName?.trim() ||
      metadata.name?.trim() ||
      [metadata.first_name, metadata.last_name].filter(Boolean).join(' ').trim() ||
      user?.email ||
      'Logged in'
    );
  }, [user]);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      setIsAccountMenuOpen(false);
      await signOut();
      navigate('/', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleAccountMenuVisibility(isOpen) {
    if (!user) {
      return;
    }
    setIsAccountMenuOpen(isOpen);
  }

  function handleAccountMenuToggle() {
    handleAccountMenuVisibility(!isAccountMenuOpen);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/95 text-navy shadow-sm backdrop-blur">
      {/* reduced padding in nav to make bar thinner */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2" aria-label="Primary">

        {/* Logo shifted left and enlarged */}
        <NavLink to="/" className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-navy hover:text-red transition-colors">
            Parity
          </span>
        </NavLink>

        {/* Links */}
        <div className="hidden items-center gap-6 md:flex">
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

        {/* Auth actions */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div
              className="relative"
              onMouseEnter={() => handleAccountMenuVisibility(true)}
              onMouseLeave={() => handleAccountMenuVisibility(false)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  handleAccountMenuVisibility(false);
                }
              }}
            >
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-navy/15 bg-white/60 px-4 py-2 text-sm font-semibold text-navy/80 shadow-sm transition hover:bg-navy/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
                aria-haspopup="true"
                aria-expanded={isAccountMenuOpen}
                onClick={handleAccountMenuToggle}
                onFocus={() => handleAccountMenuVisibility(true)}
              >
                <UserCircleIcon className="h-5 w-5 text-navy/70" />
                <span>{identityLabel}</span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${isAccountMenuOpen ? 'rotate-180 text-navy' : 'text-navy/50'}`}
                />
              </button>
              {isAccountMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-3xl border border-navy/10 bg-white/95 p-4 shadow-xl shadow-navy/10">
                  <div className="space-y-2" role="menu" aria-label="Account options">
                    <NavLink
                      to="/settings"
                      className={({ isActive }) =>
                        `flex items-center justify-between gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? 'bg-red text-white shadow-sm'
                            : 'text-navy/80 hover:bg-navy/5 hover:text-navy'
                        }`
                      }
                      onClick={() => handleAccountMenuVisibility(false)}
                    >
                      <span>Settings</span>
                      <span aria-hidden="true">→</span>
                    </NavLink>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-red transition hover:bg-red/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
                      onClick={handleSignOut}
                      disabled={isSigningOut || isLoading}
                    >
                      <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button as={NavLink} to="/login" variant="secondary" className="px-5 py-2 text-sm">
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

        {/* Mobile menu */}
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
                      className={({ isActive }) =>
                        `${linkClasses} block text-sm ${
                          isActive
                            ? 'bg-red text-white shadow-sm'
                            : 'text-navy/70 hover:text-navy hover:bg-navy/5'
                        }`
                      }
                    >
                      Settings
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
                    <Button as={NavLink} to="/login" variant="secondary" className="w-full text-sm">
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
      </nav>
    </header>
  );
}

export default NavBar;
