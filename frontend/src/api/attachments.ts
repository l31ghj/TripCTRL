import { API_BASE } from './client';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function uploadTripAttachment(
  tripId: string,
  file: File,
): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/trips/${tripId}/attachments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} - ${text}`);
  }

  return res.json();
}

export async function uploadSegmentAttachment(
  segmentId: string,
  file: File,
): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/segments/${segmentId}/attachments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} - ${text}`);
  }

  return res.json();
}

export async function deleteTripAttachment(
  tripId: string,
  attachmentId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} - ${text}`);
  }
}

export async function deleteSegmentAttachment(
  segmentId: string,
  attachmentId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/segments/${segmentId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} - ${text}`);
  }
}
