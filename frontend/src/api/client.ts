const defaultApiBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : 'http://localhost:8000/api';

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? defaultApiBase;

export const API_ORIGIN = API_BASE.replace(/\/api$/, '');


export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} – ${text}`);
  }

  return res.json();
}

export function buildImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_ORIGIN}${path}`;
}