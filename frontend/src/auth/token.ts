export function getCurrentUserEmail(): string | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payloadBase64));
    return json.email ?? null;
  } catch {
    return null;
  }
}
