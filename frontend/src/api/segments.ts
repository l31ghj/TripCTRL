import { api } from './client';

export async function createSegment(tripId: string, data: any) {
  return api(`/trips/${tripId}/segments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSegment(id: string, data: any) {
  return api(`/segments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSegment(id: string) {
  return api(`/segments/${id}`, {
    method: 'DELETE',
  });
}
