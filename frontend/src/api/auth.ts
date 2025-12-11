import { api } from './client';

export async function login(email: string, password: string) {
  const res = await api<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.accessToken) {
    localStorage.setItem('accessToken', res.accessToken);
  }
  return res;
}

export async function register(email: string, password: string) {
  const res = await api<{ accessToken?: string; status?: string; message?: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.accessToken) {
    localStorage.setItem('accessToken', res.accessToken);
  }
  return res;
}

export function logout() {
  localStorage.removeItem('accessToken');
}
