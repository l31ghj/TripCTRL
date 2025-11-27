import { api } from './client';
import type { Trip } from './trips';

export async function createSegment(
  tripId: string,
  data: unknown,
): Promise<Trip> {
  return api<Trip>(`/trips/${tripId}/segments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSegment(
  id: string,
  data: unknown,
): Promise<Trip> {
  return api<Trip>(`/segments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSegment(id: string): Promise<unknown> {
  return api(`/segments/${id}`, {
    method: 'DELETE',
  });
}
