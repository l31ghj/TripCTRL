import tripLogo from '../assets/tripctrl-logo-mark.svg';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { getCurrentUser } from '../auth/token';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('tripctrl-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function NavBar() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const email = user?.email ?? null;
  const isAdmin = user?.role === 'admin';
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('tripctrl-theme', theme);
  }, [theme]);

  function handleLogout() {
    logout();
    window.location.href = '/';
  }

  const isDark = theme === 'dark';

  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Left: Logo + primary nav */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 shadow-sm ring-1 ring-slate-900/40 dark:bg-slate-900">
              <img src={tripLogo} alt="TripCTRL logo" className="h-6 w-6" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              TripCTRL
            </span>
          </button>

          <nav className="hidden items-center gap-4 text-sm text-slate-600 dark:text-slate-300 md:flex">
            <Link
              to="/trips"
              className="rounded-full px-3 py-1 font-medium transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              My trips
            </Link>
            {isAdmin && (
              <Link
                to="/admin/users"
                className="rounded-full px-3 py-1 font-medium transition hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-slate-800 dark:hover:text-amber-200"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right: theme toggle + user + logout */}
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-[13px] text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            aria-label="Toggle dark mode"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☀' : '🌙'}
          </button>
          {email && (
            <span className="hidden text-xs text-slate-600 dark:text-slate-300 md:inline">
              Logged in as <span className="font-medium">{email}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-red-500 hover:bg-red-50 hover:text-red-700 dark:border-slate-600 dark:text-slate-100 dark:hover:border-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
