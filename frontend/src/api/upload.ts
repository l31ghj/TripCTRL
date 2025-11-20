import type { Trip } from './trips';

const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://192.168.68.131:8000/api';

/**
 * Upload a cover image for a trip.
 * Expects backend endpoint:
 *   POST /trips/:tripId/image
 * returning the updated Trip.
 */
export async function uploadTripImage(
  tripId: string,
  file: File,
): Promise<Trip> {
  const token = localStorage.getItem('accessToken');

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/trips/${tripId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} – ${text}`);
  }

  return res.json();
}
