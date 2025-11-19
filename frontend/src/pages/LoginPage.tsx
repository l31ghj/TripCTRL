import { FormEvent, useState } from 'react';
import { login, register } from '../api/auth';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/trips');
    } catch (err: any) {
      setError(err.message ?? 'Error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={onSubmit}
        className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-sm"
      >
        <h1 className="text-xl font-bold mb-4 text-center">
          {isRegister ? 'Create TripCTRL account' : 'Sign in to TripCTRL'}
        </h1>
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm mb-2">Email</label>
          <input
            className="border rounded w-full py-2 px-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm mb-2">Password</label>
          <input
            className="border rounded w-full py-2 px-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          {isRegister ? 'Register' : 'Login'}
        </button>
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="mt-3 text-sm text-blue-600 underline w-full"
        >
          {isRegister ? 'Already have an account?' : 'Create a new TripCTRL account'}
        </button>
      </form>
    </div>
  );
}
