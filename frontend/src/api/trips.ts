import { api, API_BASE, API_ORIGIN } from './client';

export type Trip = {
  id: string;
  title: string;
  mainLocation?: string | null;
  startDate: string;
  endDate: string;
  notes?: string | null;
  imagePath?: string | null;
};

export type Segment = {
  id: string;
  type: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  provider?: string | null;
  confirmationCode?: string | null;
  transportMode?: string | null;
};

export async function listTrips() {
  return api<Trip[]>('/trips');
}

export async function getTrip(id: string) {
  return api<Trip & { segments: Segment[] }>(`/trips/${id}`);
}

export async function createTrip(data: {
  title: string;
  mainLocation?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}) {
  return api<Trip>('/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTrip(
  id: string,
  data: {
    title?: string;
    mainLocation?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
  },
) {
  return api<Trip>(`/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTrip(id: string) {
  return api<void>(`/trips/${id}`, {
    method: 'DELETE',
  });
}

export async function uploadTripImage(id: string, file: File) {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_ORIGIN}/api/trips/${id}/image`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} – ${text}`);
  }

  return res.json() as Promise<Trip>;
}
