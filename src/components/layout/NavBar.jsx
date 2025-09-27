import { NavLink } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import logo from '../../assets/logo.png';

const links = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/planner', label: 'GeoBudget' },
  { to: '/insights', label: 'Smart-Spend' }
];

const linkClasses =
  'rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red';

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-navy/40 bg-gradient-to-r from-navy via-navy to-navy/90 text-offwhite backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Primary">
        <NavLink to="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-offwhite">
          <img src={logo} alt="Parity logo" className="h-8 w-auto" />
          <span className="font-poppins text-xl">Parity</span>
        </NavLink>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${linkClasses} ${
                  isActive
                    ? 'bg-offwhite/10 text-white'
                    : 'text-offwhite/80 hover:text-white hover:bg-offwhite/10'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <Button
          as={NavLink}
          to="/dashboard"
          className="hidden border border-offwhite/60 bg-red/90 px-5 py-2 text-sm font-semibold shadow-none hover:bg-red md:inline-flex"
        >
          Enter App
        </Button>
        <details className="relative md:hidden" role="list">
          <summary className="list-none rounded-full border border-offwhite/40 px-4 py-2 text-sm font-semibold text-offwhite/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red">
            Menu
          </summary>
          <div className="absolute right-0 mt-3 w-48 rounded-3xl border border-offwhite/40 bg-navy/95 p-4 shadow-xl shadow-red/20">
            <ul className="space-y-2" role="list">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      `${linkClasses} block text-sm ${
                        isActive
                          ? 'bg-offwhite/10 text-white'
                          : 'text-offwhite/80 hover:text-white hover:bg-offwhite/10'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              <li className="pt-2">
                <Button as={NavLink} to="/dashboard" className="w-full text-sm">
                  Enter App
                </Button>
              </li>
            </ul>
          </div>
        </details>
      </nav>
    </header>
  );
}

export default NavBar;
