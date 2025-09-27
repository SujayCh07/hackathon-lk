import { NavLink } from 'react-router-dom';
import Button from '../ui/Button.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/planner', label: 'GeoBudget' },
  { to: '/insights', label: 'Smart-Spend' },
  { to: '/share', label: 'Share' }
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-offwhite/80 border-b border-white/60">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Primary">
        <NavLink to="/" className="text-2xl font-poppins font-semibold text-teal">
          PPP Pocket
        </NavLink>
        <div className="hidden items-center gap-6 text-sm font-medium text-charcoal/80 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `transition-colors hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal rounded-full px-3 py-2 ${
                  isActive ? 'text-teal font-semibold' : ''
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <Button as={NavLink} to="/dashboard" className="hidden md:inline-flex">
          Enter App
        </Button>
        <details className="relative md:hidden" role="list">
          <summary className="list-none rounded-full border border-teal/30 px-4 py-2 text-sm font-semibold text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
            Menu
          </summary>
          <div className="absolute right-0 mt-3 w-48 rounded-3xl border border-white/60 bg-offwhite/95 p-4 shadow-xl shadow-teal/10">
            <ul className="space-y-2" role="list">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      `block rounded-full px-3 py-2 text-sm transition-colors hover:bg-teal/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                        isActive ? 'text-teal font-semibold' : 'text-charcoal/80'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </nav>
    </header>
  );
}

export default NavBar;
