import { api } from './client';

export async function createSegment(tripId: string, data: any) {
  return api(`/trips/${tripId}/segments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
