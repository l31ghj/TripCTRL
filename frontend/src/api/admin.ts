import { api } from './client';

export type AdminUser = {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'view_only';
  status: 'pending' | 'active' | 'rejected';
  createdAt: string;
};

export function listUsers() {
  return api<AdminUser[]>('/admin/users');
}

export function updateUserStatus(userId: string, status: 'pending' | 'active' | 'rejected') {
  return api<AdminUser>(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function updateUserRole(userId: string, role: 'admin' | 'manager' | 'member' | 'view_only') {
  return api<AdminUser>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function getFlightApiKeyStatus() {
  return api<{ hasKey: boolean; source: 'env' | 'db' | null; enabled: boolean }>(`/admin/flight-api-key`);
}

export function setFlightApiKey(apiKey?: string) {
  return api<{ saved: boolean; hasKey: boolean; source?: string }>(`/admin/flight-api-key`, {
    method: 'PUT',
    body: JSON.stringify({ apiKey }),
  });
}
