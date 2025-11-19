import { api } from './client';

export type Trip = {
  id: string;
  title: string;
  mainLocation?: string | null;
  startDate: string;
  endDate: string;
  notes?: string | null;
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
};

export async function listTrips(): Promise<Trip[]> {
  return api<Trip[]>('/trips');
}

export async function getTrip(id: string) {
  return api<{
    id: string;
    title: string;
    mainLocation?: string | null;
    startDate: string;
    endDate: string;
    notes?: string | null;
    segments: Segment[];
  }>(`/trips/${id}`);
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
