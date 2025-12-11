export type DecodedToken = {
  userId: string;
  email: string;
  role?: 'admin' | 'manager' | 'member' | 'view_only';
};

function decodeToken(): DecodedToken | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payloadBase64));
    return {
      userId: json.sub,
      email: json.email,
      role: json.role,
    };
  } catch {
    return null;
  }
}

export function getCurrentUserEmail(): string | null {
  return decodeToken()?.email ?? null;
}

export function getCurrentUser() {
  const decoded = decodeToken();
  if (!decoded) return null;
  return decoded;
}

export function getCurrentUserRole(): string | null {
  return decodeToken()?.role ?? null;
}
