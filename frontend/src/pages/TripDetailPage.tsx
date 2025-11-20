import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTrip, Segment, updateTrip, deleteTrip, uploadTripImage } from '../api/trips';
import { createSegment, updateSegment, deleteSegment } from '../api/segments';
import { NavBar } from '../components/NavBar';
import { buildImageUrl } from '../api/client';

type TripResponse = {
  id: string;
  title: string;
  mainLocation?: string | null;
  startDate: string;
  endDate: string;
  notes?: string | null;
  imagePath?: string | null;
  segments: Segment[];
};

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
};

type DayGroup = {
  dateKey: string;
  dateLabel: string;
  segments: Segment[];
};

const segmentTypeMeta: Record<
  string,
  { icon: string; label: string; badgeClass: string }
> = {
  flight: {
    icon: '✈️',
    label: 'Flight',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700/60',
  },
  accommodation: {
    icon: '🏨',
    label: 'Stay',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/60',
  },
  transport: {
    icon: '🚗',
    label: 'Transport',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/60',
  },
  activity: {
    icon: '📍',
    label: 'Activity',
    badgeClass:
      'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-700/60',
  },
  note: {
    icon: '📝',
    label: 'Note',
    badgeClass:
      'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60',
  },
};

const transportModeMeta: Record<
  string,
  { icon: string; label: string; badgeClass: string }
> = {
  flight: {
    icon: '✈️',
    label: 'Flight',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700/60',
  },
  train: {
    icon: '🚆',
    label: 'Train',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700/60',
  },
  bus: {
    icon: '🚌',
    label: 'Bus',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/60',
  },
  taxi: {
    icon: '🚕',
    label: 'Taxi',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/60',
  },
  rideshare: {
    icon: '🚘',
    label: 'Rideshare',
    badgeClass:
      'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700/60',
  },
  drive: {
    icon: '🚗',
    label: 'Drive',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/60',
  },
};

function getSegmentMeta(segment: Segment) {
  if (
    (segment.type === 'transport' || segment.type === 'flight') &&
    segment.transportMode &&
    transportModeMeta[segment.transportMode]
  ) {
    return transportModeMeta[segment.transportMode];
  }
  return (
    segmentTypeMeta[segment.type] ?? {
      icon: '📌',
      label: segment.type,
      badgeClass:
        'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700/60',
    }
  );
}

export function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [savingTrip, setSavingTrip] = useState(false);
  const [savingSegment, setSavingSegment] = useState(false);
  const [showDetailsEditor, setShowDetailsEditor] = useState(false);

  const [tripTitle, setTripTitle] = useState('');
  const [tripLocation, setTripLocation] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [tripNotes, setTripNotes] = useState('');

  const [segmentForm, setSegmentForm] = useState<SegmentFormState>({
    type: 'flight',
    transportMode: 'flight',
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    provider: '',
    confirmationCode: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getTrip(id);
        setTrip(data);
        setTripTitle(data.title);
        setTripLocation(data.mainLocation ?? '');
        setTripStartDate(data.startDate.slice(0, 10));
        setTripEndDate(data.endDate.slice(0, 10));
        setTripNotes(data.notes ?? '');
      } catch (err: any) {
        setError(err.message ?? 'Error loading trip');
      }
    })();
  }, [id]);

  const dayGroups: DayGroup[] = useMemo(() => {
    if (!trip) return [];
    const groups: Record<string, DayGroup> = {};
    for (const seg of trip.segments) {
      const start = new Date(seg.startTime);
      const key = start.toISOString().slice(0, 10);
      if (!groups[key]) {
        groups[key] = {
          dateKey: key,
          dateLabel: start.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          segments: [],
        };
      }
      groups[key].segments.push(seg);
    }
    return Object.values(groups).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey),
    );
  }, [trip]);

  function resetSegmentForm() {
    setSegmentForm({
      type: 'flight',
      transportMode: 'flight',
      title: '',
      startTime: '',
      endTime: '',
      location: '',
      provider: '',
      confirmationCode: '',
    });
    setSegmentError(null);
  }

  async function handleSaveTripDetails(e: any) {
    e.preventDefault();
    if (!trip) return;
    setSavingTrip(true);
    setError(null);
    try {
      const updated = await updateTrip(trip.id, {
        title: tripTitle,
        mainLocation: tripLocation || undefined,
        startDate: tripStartDate || undefined,
        endDate: tripEndDate || undefined,
        notes: tripNotes || undefined,
      });
      setTrip((prev) =>
        prev ? { ...prev, ...updated } : { ...updated, segments: [] },
      );
      setShowDetailsEditor(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save trip');
    } finally {
      setSavingTrip(false);
    }
  }

  function handleEditSegment(seg: Segment) {
    setSegmentForm({
      id: seg.id,
      type: seg.type,
      transportMode: seg.transportMode ?? (seg.type === 'flight' ? 'flight' : ''),
      title: seg.title,
      startTime: seg.startTime.slice(0, 16),
      endTime: seg.endTime ? seg.endTime.slice(0, 16) : '',
      location: seg.location ?? '',
      provider: seg.provider ?? '',
      confirmationCode: seg.confirmationCode ?? '',
    });
    setSegmentError(null);
  }

  async function handleDeleteTrip() {
    if (!trip) return;
    if (!window.confirm('Delete this trip and all its segments?')) return;
    try {
      await deleteTrip(trip.id);
      navigate('/trips');
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete trip');
    }
  }

  async function handleSegmentSubmit(e: any) {
    e.preventDefault();
    if (!trip) return;
    setSavingSegment(true);
    setSegmentError(null);
    try {
      const payload: any = {
        type: segmentForm.type,
        transportMode:
          segmentForm.type === 'transport' || segmentForm.type === 'flight'
            ? segmentForm.transportMode || null
            : null,
        title: segmentForm.title,
        startTime: segmentForm.startTime,
        endTime: segmentForm.endTime || undefined,
        location: segmentForm.location || undefined,
        provider: segmentForm.provider || undefined,
        confirmationCode: segmentForm.confirmationCode || undefined,
      };

      if (segmentForm.id) {
        const updated = await updateSegment(segmentForm.id, payload);
        setTrip((prev) =>
          prev
            ? {
                ...prev,
                segments: prev.segments.map((s) =>
                  s.id === updated.id ? (updated as Segment) : s,
                ),
              }
            : prev,
        );
      } else {
        const created = await createSegment(trip.id, payload);
        setTrip((prev) =>
          prev
            ? {
                ...prev,
                segments: [...prev.segments, created as Segment].sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime(),
                ),
              }
            : prev,
        );
      }
      resetSegmentForm();
    } catch (err: any) {
      setSegmentError(err.message ?? 'Failed to save segment');
    } finally {
      setSavingSegment(false);
    }
  }

  async function handleDeleteSegment(seg: Segment) {
    if (!trip) return;
    if (!window.confirm('Delete this segment?')) return;
    try {
      await deleteSegment(seg.id);
      setTrip((prev) =>
        prev
          ? { ...prev, segments: prev.segments.filter((s) => s.id !== seg.id) }
          : prev,
      );
    } catch (err: any) {
      setSegmentError(err.message ?? 'Failed to delete segment');
    }
  }

  async function handleImageChange(e: any) {
    if (!trip) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadingImage(true);
    try {
      const updated = await uploadTripImage(trip.id, file);
      setTrip((prev) =>
        prev ? { ...prev, imagePath: updated.imagePath } : prev,
      );
    } catch (err: any) {
      setUploadError(err.message ?? 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No trip id provided.
          </p>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6">
          {error ? (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600/60 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading trip…
            </p>
          )}
        </main>
      </div>
    );
  }

  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const coverUrl = buildImageUrl(trip.imagePath);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        {/* Header / title card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
          {coverUrl && (
            <div className="relative h-40 w-full overflow-hidden">
              <img
                src={coverUrl}
                alt={trip.title}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
            </div>
          )}
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {trip.title}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                  {trip.mainLocation && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-base">📍</span>
                      <span>{trip.mainLocation}</span>
                    </span>
                  )}
                  <span>•</span>
                  <span>
                    {start.toLocaleDateString()} – {end.toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetailsEditor((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                >
                  ✏️ Edit details
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTrip}
                  className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:border-red-500 hover:bg-red-100 dark:border-red-700/70 dark:bg-red-900/40 dark:text-red-200 dark:hover:border-red-400 dark:hover:bg-red-800/60"
                >
                  🗑 Delete trip
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
              >
                {uploadingImage ? 'Uploading…' : coverUrl ? 'Change cover' : 'Add cover image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {uploadError && (
                <span className="text-xs text-red-600 dark:text-red-300">
                  {uploadError}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Trip details editor (toggled from header) */}
        {showDetailsEditor && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Trip details
            </h2>
            <form
              onSubmit={handleSaveTripDetails}
              className="mt-3 grid gap-3 md:grid-cols-2 md:gap-4"
            >
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Title
                </label>
                <input
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Main location
                </label>
                <input
                  value={tripLocation}
                  onChange={(e) => setTripLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Start date
                </label>
                <input
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => setTripStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  End date
                </label>
                <input
                  type="date"
                  value={tripEndDate}
                  onChange={(e) => setTripEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                  placeholder="High-level plans, packing notes, booking references, etc."
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetailsEditor(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTrip}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  {savingTrip ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600/60 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Itinerary – now directly under header */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Day-by-day itinerary
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {trip.segments.length} segment
              {trip.segments.length === 1 ? '' : 's'}
            </span>
          </div>
          {dayGroups.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No segments yet. Use the form below to start building your itinerary.
            </p>
          ) : (
            <ol className="space-y-4">
              {dayGroups.map((group) => (
                <li key={group.dateKey} className="flex gap-3">
                  <div className="mt-1 flex w-20 flex-col items-start text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {group.dateLabel}
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-3">
                      {group.segments.map((seg, idx) => {
                        const meta = getSegmentMeta(seg);
                        const startTime = new Date(seg.startTime);
                        const endTime = seg.endTime ? new Date(seg.endTime) : null;

                        return (
                          <div
                            key={seg.id}
                            className="relative flex items-stretch gap-3"
                          >
                            <div className="z-10 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow ring-2 ring-slate-200 dark:bg-slate-900 dark:ring-slate-600">
                              <span>{meta.icon}</span>
                            </div>
                            <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-slate-50">
                                    {seg.title}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}
                                    >
                                      <span>{meta.icon}</span>
                                      <span>{meta.label}</span>
                                    </span>
                                    {seg.location && (
                                      <span className="inline-flex items-center gap-1">
                                        <span>📍</span>
                                        <span>{seg.location}</span>
                                      </span>
                                    )}
                                    {seg.provider && (
                                      <span className="inline-flex items-center gap-1">
                                        <span>🏷</span>
                                        <span>{seg.provider}</span>
                                      </span>
                                    )}
                                    {seg.confirmationCode && (
                                      <span className="inline-flex items-center gap-1">
                                        <span>🔐</span>
                                        <span>{seg.confirmationCode}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  <div>
                                    {startTime.toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    {endTime && (
                                      <>
                                        {' – '}
                                        {endTime.toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditSegment(seg)}
                                      className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSegment(seg)}
                                      className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 transition hover:border-red-500 hover:bg-red-100 dark:border-red-700/70 dark:bg-red-900/40 dark:text-red-200 dark:hover:border-red-400 dark:hover:bg-red-800/60"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {idx !== group.segments.length - 1 && (
                              <div className="absolute left-[21px] top-5 bottom-[-6px] w-px bg-slate-200 dark:bg-slate-700" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Segment form below itinerary */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Add or edit segment
          </h2>
          {segmentError && (
            <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-600/60 dark:bg-red-900/30 dark:text-red-200">
              {segmentError}
            </div>
          )}
          <form
            onSubmit={handleSegmentSubmit}
            className="mt-3 grid gap-3 md:grid-cols-2 md:gap-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Segment type
              </label>
              <select
                value={segmentForm.type}
                onChange={(e) =>
                  setSegmentForm((prev) => ({
                    ...prev,
                    type: e.target.value,
                    transportMode:
                      e.target.value === 'flight'
                        ? 'flight'
                        : prev.transportMode,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="flight">Flight</option>
                <option value="accommodation">Accommodation</option>
                <option value="transport">Transport</option>
                <option value="activity">Activity</option>
                <option value="note">Note</option>
              </select>
            </div>

            {(segmentForm.type === 'transport' || segmentForm.type === 'flight') && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Transport mode
                </label>
                <select
                  value={segmentForm.transportMode}
                  onChange={(e) =>
                    setSegmentForm((prev) => ({
                      ...prev,
                      transportMode: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
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

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Title
              </label>
              <input
                required
                value={segmentForm.title}
                onChange={(e) =>
                  setSegmentForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                placeholder="e.g. QF15 Brisbane → Los Angeles"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Start time
              </label>
              <input
                type="datetime-local"
                required
                value={segmentForm.startTime}
                onChange={(e) =>
                  setSegmentForm((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                End time (optional)
              </label>
              <input
                type="datetime-local"
                value={segmentForm.endTime}
                onChange={(e) =>
                  setSegmentForm((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Location (optional)
              </label>
              <input
                value={segmentForm.location}
                onChange={(e) =>
                  setSegmentForm((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                placeholder="Airport, hotel name, meeting point…"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Provider (optional)
              </label>
              <input
                value={segmentForm.provider}
                onChange={(e) =>
                  setSegmentForm((prev) => ({
                    ...prev,
                    provider: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                placeholder="Airline, hotel chain, etc."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Confirmation / booking code (optional)
              </label>
              <input
                value={segmentForm.confirmationCode}
                onChange={(e) =>
                  setSegmentForm((prev) => ({
                    ...prev,
                    confirmationCode: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                placeholder="ABC123"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={resetSegmentForm}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear form
              </button>
              <button
                type="submit"
                disabled={savingSegment}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                {savingSegment
                  ? 'Saving…'
                  : segmentForm.id
                  ? 'Update segment'
                  : 'Add segment'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
