import { api } from './client';

export type Attachment = {
  id: string;
  path: string;
  originalName: string;
  mimeType?: string | null;
  size?: number | null;
};

export type Trip = {
  id: string;
  title: string;
  mainLocation?: string | null;
  startDate: string;
  endDate: string;
  notes?: string | null;
  imagePath?: string | null;
  attachments?: Attachment[] | null;
};

export type SegmentDetails = {
  activityNotes?: string;
  notes?: string;
  [key: string]: any;
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
  flightNumber?: string | null;
  seatNumber?: string | null;
  passengerName?: string | null;
  details?: SegmentDetails | string | null;
  attachments?: Attachment[] | null;
};

export async function listTrips() {
  return api<Trip[]>('/trips');
}

export const getTrips = listTrips;
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
