import { api } from './client';

export type AdminUser = {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
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

export function updateUserRole(userId: string, role: 'admin' | 'manager' | 'member') {
  return api<AdminUser>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}
