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
    <header className="w-full bg-white shadow-sm mb-4">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span
            className="text-xl font-bold text-blue-700 cursor-pointer"
            onClick={() => navigate('/trips')}
          >
            TripCTRL
          </span>
          <nav className="flex items-center gap-3 text-sm text-gray-700">
            <Link to="/trips" className="hover:text-blue-600">
              My Trips
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="text-gray-600">Logged in as {email}</span>}
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
