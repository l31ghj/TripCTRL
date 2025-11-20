import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { getCurrentUserEmail } from '../auth/token';

export function NavBar() {
  const navigate = useNavigate();
  const email = getCurrentUserEmail();

  function handleLogout() {
    logout();
    window.location.href = '/login';
  }

  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Left: Logo + primary nav */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
              TC
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              TripCTRL
            </span>
          </button>

          <nav className="hidden items-center gap-4 text-sm text-slate-600 md:flex">
            <Link
              to="/trips"
              className="rounded-full px-3 py-1 font-medium transition hover:bg-blue-50 hover:text-blue-700"
            >
              My trips
            </Link>
            {/* future: dashboard, settings, etc */}
          </nav>
        </div>

        {/* Right: user + logout */}
        <div className="flex items-center gap-3 text-sm">
          {email && (
            <span className="hidden text-slate-600 md:inline">
              Logged in as <span className="font-medium">{email}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-red-500 hover:bg-red-50 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
