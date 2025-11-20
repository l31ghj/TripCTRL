import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTrip } from '../api/trips';
import { Segment } from '../api/trips';
import { createSegment, deleteSegment, updateSegment } from '../api/segments';
import { uploadTripImage } from '../api/upload';
import { api } from '../api/client';
import { NavBar } from '../components/NavBar';

type TripDetail = Awaited<ReturnType<typeof getTrip>>;

type SegmentFormState = {
  id?: string;
  type: string;
  transportMode: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  provider: string;
  confirmationCode: string;
  flightNumber: string;
  seatNumber: string;
  passengerName: string;
};

type TripFormState = {
  title: string;
  mainLocation: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const emptyTripForm: TripFormState = {
  title: '',
  mainLocation: '',
  startDate: '',
  endDate: '',
  notes: '',
};

const emptySegmentForm: SegmentFormState = {
  type: 'transport',
  transportMode: 'flight',
  title: '',
  startTime: '',
  endTime: '',
  location: '',
  provider: '',
  confirmationCode: '',
  flightNumber: '',
  seatNumber: '',
  passengerName: '',
};

function toLocalInputValue(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(input: string) {
  if (!input) return null;
  const d = new Date(input);
  return d.toISOString();
}

function renderTimeRange(start: string, end?: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!endDate) return fmtTime(startDate);
  return `${fmtTime(startDate)} – ${fmtTime(endDate)}`;
}

function getSegmentMeta(type: string) {
  switch (type) {
    case 'accommodation':
      return {
        icon: '🏨',
        label: 'Stay',
        badgeClass:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/40 dark:text-emerald-100',
      };
    case 'transport':
      return {
        icon: '🧭',
        label: 'Transport',
        badgeClass:
          'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-900/40 dark:text-sky-100',
      };
    case 'activity':
      return {
        icon: '🎟️',
        label: 'Activity',
        badgeClass:
          'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100',
      };
    case 'note':
      return {
        icon: '📝',
        label: 'Note',
        badgeClass:
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
      };
    default:
      return {
        icon: '📌',
        label: 'Other',
        badgeClass:
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
      };
  }
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);

  const [segmentForm, setSegmentForm] = useState<SegmentFormState>(
    emptySegmentForm,
  );
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

  const [tripForm, setTripForm] = useState<TripFormState>(emptyTripForm);
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [tripFormError, setTripFormError] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getTrip(id);
        setTrip(data);
        setTripError(null);

        setTripForm({
          title: data.title,
          mainLocation: data.mainLocation ?? '',
          startDate: data.startDate.slice(0, 10),
          endDate: data.endDate.slice(0, 10),
          notes: data.notes ?? '',
        });
      } catch (err: any) {
        console.error(err);
        setTripError('Could not load trip. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const sortedSegments = useMemo(() => {
    if (!trip?.segments) return [];
    return [...trip.segments].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [trip]);

  const segmentsByDay = useMemo(() => {
    const map: Record<string, Segment[]> = {};
    for (const s of sortedSegments) {
      const d = new Date(s.startTime);
      const key = d.toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sortedSegments]);

  const sortedDayKeys = useMemo(
    () => Object.keys(segmentsByDay).sort(),
    [segmentsByDay],
  );

  function resetSegmentForm() {
    setSegmentForm(emptySegmentForm);
    setEditingSegmentId(null);
    setSegmentError(null);
  }

  function handleTripFieldChange<K extends keyof TripFormState>(
    key: K,
    value: TripFormState[K],
  ) {
    setTripForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveTripDetails(e: any) {
    e.preventDefault();
    if (!id) return;

    if (tripForm.startDate && tripForm.endDate) {
      const s = new Date(tripForm.startDate);
      const eDate = new Date(tripForm.endDate);
      if (eDate < s) {
        setTripFormError('End date cannot be before start date.');
        return;
      }
    }

    try {
      setTripFormError(null);
      const payload = {
        title: tripForm.title || trip?.title || '',
        mainLocation: tripForm.mainLocation || undefined,
        startDate: tripForm.startDate
          ? new Date(tripForm.startDate).toISOString()
          : trip?.startDate,
        endDate: tripForm.endDate
          ? new Date(tripForm.endDate).toISOString()
          : trip?.endDate,
        notes: tripForm.notes || undefined,
      };
      const updated = await api<TripDetail>(`/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setTrip(updated);
      setTripFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setTripFormError('Failed to update trip details. Please try again.');
    }
  }

  function handleSegmentFieldChange<
    K extends keyof SegmentFormState,
  >(key: K, value: SegmentFormState[K]) {
    setSegmentForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSegmentSubmit(e: any) {
    e.preventDefault();
    if (!id) return;

    if (!segmentForm.title || !segmentForm.startTime) {
      setSegmentError('Title and start time are required.');
      return;
    }

    try {
      setSegmentError(null);

      const payload: any = {
        type: segmentForm.type,
        transportMode:
          segmentForm.type === 'transport'
            ? segmentForm.transportMode || null
            : null,
        title: segmentForm.title,
        startTime: toIso(segmentForm.startTime),
        endTime: toIso(segmentForm.endTime),
        location: segmentForm.location || undefined,
        provider: segmentForm.provider || undefined,
        confirmationCode: segmentForm.confirmationCode || undefined,
        flightNumber: segmentForm.flightNumber || undefined,
        seatNumber: segmentForm.seatNumber || undefined,
        passengerName: segmentForm.passengerName || undefined,
      };

      let updatedTrip: TripDetail;
      if (editingSegmentId) {
        updatedTrip = await updateSegment(id, editingSegmentId, payload);
      } else {
        updatedTrip = await createSegment(id, payload);
      }

      setTrip(updatedTrip);
      resetSegmentForm();
    } catch (err: any) {
      console.error(err);
      setSegmentError('Failed to save segment. Please try again.');
    }
  }

  function handleEditSegment(seg: Segment) {
    setEditingSegmentId(seg.id);
    setSegmentForm({
      id: seg.id,
      type: seg.type,
      transportMode:
        seg.type === 'transport' && seg.transportMode
          ? seg.transportMode
          : seg.type === 'flight'
          ? 'flight'
          : '',
      title: seg.title,
      startTime: toLocalInputValue(seg.startTime),
      endTime: seg.endTime ? toLocalInputValue(seg.endTime) : '',
      location: seg.location ?? '',
      provider: seg.provider ?? '',
      confirmationCode: seg.confirmationCode ?? '',
      flightNumber: seg.flightNumber ?? '',
      seatNumber: seg.seatNumber ?? '',
      passengerName: seg.passengerName ?? '',
    });
  }

  async function handleDeleteSegment(seg: Segment) {
    if (!id) return;
    if (!confirm('Delete this segment?')) return;
    try {
      const updated = await deleteSegment(id, seg.id);
      setTrip(updated);
      if (editingSegmentId === seg.id) resetSegmentForm();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete segment.');
    }
  }

  async function handleImageChange(e: any) {
    if (!id) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const updated = await uploadTripImage(id, file);
      setTrip(updated);
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
        <NavBar />
        <main className="mx-auto flex max-w-5xl flex-1 items-center justify-center px-4">
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Loading trip…
          </p>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
        <NavBar />
        <main className="mx-auto flex max-w-5xl flex-1 items-center justify-center px-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
            {tripError || 'Trip not found.'}
          </div>
        </main>
      </div>
    );
  }

  const today = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntil = Math.ceil(
    (start.getTime() - today.getTime()) / msPerDay,
  );
  const isUpcoming = daysUntil > 0;
  const isToday = daysUntil === 0;
  const isPast = today > end;

  let statusLabel = '';
  let statusClass =
    'border-slate-200 bg-slate-50 text-slate-700 dark;border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  if (isUpcoming) {
    statusLabel = `Starts in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
    statusClass =
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100';
  } else if (isToday) {
    statusLabel = 'Starts today';
    statusClass =
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100';
  } else if (isPast) {
    statusLabel = 'Completed';
    statusClass =
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300';
  } else {
    statusLabel = 'In progress';
    statusClass =
      'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100';
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <NavBar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-8 pt-4">
        {/* Trip header */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="relative h-48 w-full overflow-hidden">
            {trip.imagePath ? (
              <img
                src={trip.imagePath}
                alt={trip.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 text-slate-300">
                <span className="text-sm font-medium opacity-80">
                  No cover image yet
                </span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-6 pb-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 inline-flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                      Trip overview
                    </span>
                    {statusLabel && (
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    )}
                  </div>
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {trip.title}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-100/80">
                    {trip.mainLocation && (
                      <span className="inline-flex items-center gap-1">
                        <span>📍</span>
                        <span>{trip.mainLocation}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <span>🗓</span>
                      <span>
                        {new Date(trip.startDate).toLocaleDateString()} –{' '}
                        {new Date(trip.endDate).toLocaleDateString()}
                      </span>
                    </span>
                    {sortedSegments.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span>🧩</span>
                        <span>{sortedSegments.length} segments</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur hover:bg-white/20">
                    <span>{uploadingImage ? 'Uploading…' : 'Change cover'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={uploadingImage}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setTripFormOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur hover:bg-white/20"
                  >
                    ✏️ Edit details
                  </button>
                </div>
              </div>
              {trip.notes && (
                <p className="max-w-2xl text-xs text-slate-100/90">
                  {trip.notes}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Trip details modal */}
        {tripFormOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Edit trip details
                </h2>
                <button
                  type="button"
                  onClick={() => setTripFormOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  Close
                </button>
              </div>
              {tripFormError && (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
                  {tripFormError}
                </div>
              )}
              <form
                onSubmit={handleSaveTripDetails}
                className="space-y-3 text-xs text-slate-700 dark:text-slate-200"
              >
                <div>
                  <label className="mb-1 block font-medium">Title</label>
                  <input
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                    value={tripForm.title}
                    onChange={(e) =>
                      handleTripFieldChange('title', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">Main location</label>
                  <input
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                    value={tripForm.mainLocation}
                    onChange={(e) =>
                      handleTripFieldChange('mainLocation', e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium">Start date</label>
                    <input
                      type="date"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                      value={tripForm.startDate}
                      onChange={(e) =>
                        handleTripFieldChange('startDate', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">End date</label>
                    <input
                      type="date"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                      value={tripForm.endDate}
                      onChange={(e) =>
                        handleTripFieldChange('endDate', e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-medium">Notes</label>
                  <textarea
                    className="min-h-[60px] w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                    value={tripForm.notes}
                    onChange={(e) =>
                      handleTripFieldChange('notes', e.target.value)
                    }
                  />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTripFormOpen(false)}
                    className="rounded-full px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* Segment form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                New segment
              </h2>
              {segmentError && (
                <span className="text-xs text-red-600 dark:text-red-300">
                  {segmentError}
                </span>
              )}
            </div>
            <form
              onSubmit={handleSegmentSubmit}
              className="grid grid-cols-1 gap-3 text-xs text-slate-700 md:grid-cols-2 dark:text-slate-200"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Type
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.type}
                  onChange={(e) =>
                    handleSegmentFieldChange('type', e.target.value)
                  }
                >
                  <option value="transport">Transport</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="activity">Activity</option>
                  <option value="note">Note</option>
                </select>
                {segmentForm.type === 'transport' && (
                  <div className="mt-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                      Mode
                    </label>
                    <select
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                      value={segmentForm.transportMode}
                      onChange={(e) =>
                        handleSegmentFieldChange(
                          'transportMode',
                          e.target.value,
                        )
                      }
                    >
                      <option value="flight">Flight</option>
                      <option value="train">Train</option>
                      <option value="bus">Bus</option>
                      <option value="taxi">Taxi</option>
                      <option value="rideshare">Rideshare</option>
                      <option value="drive">Drive</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Title
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.title}
                  onChange={(e) =>
                    handleSegmentFieldChange('title', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Start time
                </label>
                <input
                  type="datetime-local"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.startTime}
                  onChange={(e) =>
                    handleSegmentFieldChange('startTime', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  End time
                </label>
                <input
                  type="datetime-local"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.endTime}
                  onChange={(e) =>
                    handleSegmentFieldChange('endTime', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Location
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.location}
                  onChange={(e) =>
                    handleSegmentFieldChange('location', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Provider
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark;border-slate-600 dark:bg-slate-900"
                  value={segmentForm.provider}
                  onChange={(e) =>
                    handleSegmentFieldChange('provider', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Confirmation code
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.confirmationCode}
                  onChange={(e) =>
                    handleSegmentFieldChange(
                      'confirmationCode',
                      e.target.value,
                    )
                  }
                />
              </div>

              {segmentForm.type === 'transport' &&
                segmentForm.transportMode === 'flight' && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                        Flight number
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                        value={segmentForm.flightNumber}
                        onChange={(e) =>
                          handleSegmentFieldChange(
                            'flightNumber',
                            e.target.value,
                          )
                        }
                        placeholder="e.g. QF15"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                        Seat number
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                        value={segmentForm.seatNumber}
                        onChange={(e) =>
                          handleSegmentFieldChange(
                            'seatNumber',
                            e.target.value,
                          )
                        }
                        placeholder="e.g. 32A"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                        Passenger name
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                        value={segmentForm.passengerName}
                        onChange={(e) =>
                          handleSegmentFieldChange(
                            'passengerName',
                            e.target.value,
                          )
                        }
                        placeholder="Name on booking"
                      />
                    </div>
                  </>
                )}

              <div className="mt-2 flex items-center justify-between md:col-span-2">
                <button
                  type="button"
                  onClick={resetSegmentForm}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  {editingSegmentId ? 'Update segment' : 'Add segment'}
                </button>
              </div>
            </form>
          </section>

          {/* Itinerary */}
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Itinerary
            </h2>
            {sortedDayKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No segments yet. Add flights, stays, transport, or activities
                on the left.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedDayKeys.map((dayKey) => {
                  const daySegments = segmentsByDay[dayKey];
                  const dateLabel = new Date(dayKey).toLocaleDateString();

                  return (
                    <div
                      key={dayKey}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {dateLabel}
                      </div>
                      <div className="space-y-2">
                        {daySegments.map((s) => {
                          const meta = getSegmentMeta(s.type);
                          return (
                            <div
                              key={s.id}
                              className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800"
                            >
                              <div className="flex flex-1 gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-700">
                                  {meta.icon}
                                </div>
                                <div>
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {s.title}
                                    </span>
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}
                                    >
                                      {meta.label}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-300">
                                    {renderTimeRange(
                                      s.startTime,
                                      s.endTime,
                                    )}
                                  </div>
                                  <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-300">
                                    {(s.location || s.provider) && (
                                      <div>
                                        {s.location}
                                        {s.location && s.provider && ' · '}
                                        {s.provider}
                                      </div>
                                    )}
                                    {s.confirmationCode && (
                                      <div className="text-[11px] text-slate-400 dark:text-slate-400">
                                        Ref: {s.confirmationCode}
                                      </div>
                                    )}
                                    {(s.flightNumber ||
                                      s.seatNumber ||
                                      s.passengerName) && (
                                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-300">
                                        {s.flightNumber && (
                                          <span className="inline-flex items-center gap-1">
                                            <span>✈️</span>
                                            <span>{s.flightNumber}</span>
                                          </span>
                                        )}
                                        {s.seatNumber && (
                                          <span className="inline-flex items-center gap-1">
                                            <span>💺</span>
                                            <span>{s.seatNumber}</span>
                                          </span>
                                        )}
                                        {s.passengerName && (
                                          <span className="inline-flex items-center gap-1">
                                            <span>👤</span>
                                            <span>{s.passengerName}</span>
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditSegment(s)}
                                  className="rounded-full px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSegment(s)}
                                  className="rounded-full px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
