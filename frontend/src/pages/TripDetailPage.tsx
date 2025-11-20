import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTrip, Segment, updateTrip, deleteTrip } from '../api/trips';
import { createSegment, updateSegment, deleteSegment } from '../api/segments';
import { NavBar } from '../components/NavBar';

type TripResponse = {
  id: string;
  title: string;
  mainLocation?: string | null;
  startDate: string;
  endDate: string;
  notes?: string | null;
  segments: Segment[];
};

type SegmentFormState = {
  id?: string;
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  provider: string;
  confirmationCode: string;
};

const emptySegmentForm: SegmentFormState = {
  type: 'flight',
  title: '',
  startTime: '',
  endTime: '',
  location: '',
  provider: '',
  confirmationCode: '',
};

const segmentTypeMeta: Record<
  string,
  { icon: string; label: string; badgeClass: string }
> = {
  flight: {
    icon: '✈️',
    label: 'Flight',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-100',
  },
  accommodation: {
    icon: '🏨',
    label: 'Stay',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-100',
  },
  transport: {
    icon: '🚗',
    label: 'Transport',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-100',
  },
  activity: {
    icon: '🎟️',
    label: 'Activity',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  },
  note: {
    icon: '📝',
    label: 'Note',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-100',
  },
};

function getSegmentMeta(type: string) {
  return (
    segmentTypeMeta[type] ?? {
      icon: '📌',
      label: type,
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-100',
    }
  );
}

export function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [segmentForm, setSegmentForm] =
    useState<SegmentFormState>(emptySegmentForm);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getTrip(id);
        setTrip(data);
        setEditTitle(data.title);
        setEditLocation(data.mainLocation ?? '');
        setEditStartDate(data.startDate.slice(0, 10));
        setEditEndDate(data.endDate.slice(0, 10));
        setEditNotes(data.notes ?? '');
      } catch (err: any) {
        setError(err.message ?? 'Error loading trip');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const segmentsByDay = useMemo(() => {
    if (!trip) return {};
    const groups: Record<string, Segment[]> = {};
    for (const s of trip.segments ?? []) {
      const d = new Date(s.startTime);
      const key = d.toISOString().slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    Object.values(groups).forEach((list) =>
      list.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    );
    return groups;
  }, [trip]);

  const sortedDayKeys = useMemo(
    () => Object.keys(segmentsByDay).sort(),
    [segmentsByDay],
  );

  async function handleUpdateTrip() {
    if (!trip) return;
    try {
      const updated = await updateTrip(trip.id, {
        title: editTitle,
        mainLocation: editLocation || undefined,
        startDate: editStartDate,
        endDate: editEndDate,
        notes: editNotes || undefined,
      });
      setTrip({ ...trip, ...updated });
    } catch (err: any) {
      setError(err.message ?? 'Failed to update trip');
    }
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

  function resetSegmentForm() {
    setSegmentForm(emptySegmentForm);
    setEditingSegmentId(null);
    setSegmentError(null);
  }

  function handleSegmentFieldChange<K extends keyof SegmentFormState>(
    key: K,
    value: SegmentFormState[K],
  ) {
    setSegmentForm((prev) => ({ ...prev, [key]: value }));
  }

  function toIso(dtLocal: string): string | undefined {
    if (!dtLocal) return undefined;
    return new Date(dtLocal).toISOString();
  }

  async function handleSegmentSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!trip) return;
    setSegmentError(null);

    try {
      const payload = {
        type: segmentForm.type,
        title: segmentForm.title,
        startTime: toIso(segmentForm.startTime),
        endTime: toIso(segmentForm.endTime),
        location: segmentForm.location || undefined,
        provider: segmentForm.provider || undefined,
        confirmationCode: segmentForm.confirmationCode || undefined,
      };

      if (!payload.startTime) {
        setSegmentError('Start time is required');
        return;
      }

      if (editingSegmentId) {
        const updated = await updateSegment(editingSegmentId, payload);
        setTrip({
          ...trip,
          segments: trip.segments.map((s) =>
            s.id === editingSegmentId ? updated : s,
          ),
        });
      } else {
        const created = await createSegment(trip.id, payload);
        setTrip({
          ...trip,
          segments: [...trip.segments, created],
        });
      }

      resetSegmentForm();
    } catch (err: any) {
      setSegmentError(err.message ?? 'Failed to save segment');
    }
  }

  function handleEditSegment(seg: Segment) {
    setEditingSegmentId(seg.id);
    setSegmentForm({
      id: seg.id,
      type: seg.type,
      title: seg.title,
      startTime: seg.startTime.slice(0, 16),
      endTime: seg.endTime ? seg.endTime.slice(0, 16) : '',
      location: seg.location ?? '',
      provider: seg.provider ?? '',
      confirmationCode: seg.confirmationCode ?? '',
    });
  }

  async function handleDeleteSegment(seg: Segment) {
    if (!trip) return;
    if (!window.confirm('Delete this segment?')) return;
    try {
      await deleteSegment(seg.id);
      setTrip({
        ...trip,
        segments: trip.segments.filter((s) => s.id !== seg.id),
      });
    } catch (err: any) {
      setSegmentError(err.message ?? 'Failed to delete segment');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <NavBar />
        <div className="px-4 py-6 text-sm text-slate-600">
          Loading trip…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100">
        <NavBar />
        <div className="px-4 py-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-100">
        <NavBar />
        <div className="px-4 py-6 text-sm text-slate-600">Trip not found.</div>
      </div>
    );
  }

  const startLabel = new Date(trip.startDate).toLocaleDateString();
  const endLabel = new Date(trip.endDate).toLocaleDateString();

  return (
    <div className="min-h-screen bg-slate-100">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6 space-y-6">
        {/* Trip header card */}
        <section className="rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 p-5 text-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {trip.title}
              </h1>
              <div className="mt-1 text-sm text-blue-50">
                {trip.mainLocation && (
                  <>
                    <span className="font-medium text-white">
                      {trip.mainLocation}
                    </span>{' '}
                    ·{' '}
                  </>
                )}
                {startLabel} – {endLabel}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteTrip}
                className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
              >
                Delete trip
              </button>
            </div>
          </div>
        </section>

        {/* Trip details form */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Trip details
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Title
              </label>
              <input
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Main location
              </label>
              <input
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Start date
              </label>
              <input
                type="date"
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                End date
              </label>
              <input
                type="date"
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Notes
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleUpdateTrip}
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Save changes
            </button>
          </div>
        </section>

        {/* Segment form */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">
              {editingSegmentId ? 'Edit segment' : 'Add segment'}
            </h2>
            {editingSegmentId && (
              <button
                type="button"
                onClick={resetSegmentForm}
                className="text-xs font-medium text-slate-500 underline"
              >
                Cancel edit
              </button>
            )}
          </div>
          {segmentError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {segmentError}
            </div>
          )}
          <form
            onSubmit={handleSegmentSubmit}
            className="grid gap-3 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Type
              </label>
              <select
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={segmentForm.type}
                onChange={(e) =>
                  handleSegmentFieldChange('type', e.target.value)
                }
              >
                <option value="flight">Flight</option>
                <option value="accommodation">Accommodation</option>
                <option value="transport">Transport</option>
                <option value="activity">Activity</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Title
              </label>
              <input
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={segmentForm.title}
                onChange={(e) =>
                  handleSegmentFieldChange('title', e.target.value)
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Start time
              </label>
              <input
                type="datetime-local"
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={segmentForm.startTime}
                onChange={(e) =>
                  handleSegmentFieldChange('startTime', e.target.value)
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                End time
              </label>
              <input
                type="datetime-local"
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={segmentForm.endTime}
                onChange={(e) =>
                  handleSegmentFieldChange('endTime', e.target.value)
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Location
              </label>
              <input
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={segmentForm.location}
                onChange={(e) =>
                  handleSegmentFieldChange('location', e.target.value)
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Provider
              </label>
              <input
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={segmentForm.provider}
                onChange={(e) =>
                  handleSegmentFieldChange('provider', e.target.value)
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Confirmation code
              </label>
              <input
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={segmentForm.confirmationCode}
                onChange={(e) =>
                  handleSegmentFieldChange(
                    'confirmationCode',
                    e.target.value,
                  )
                }
              />
            </div>
          </form>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => handleSegmentSubmit()}
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {editingSegmentId ? 'Save segment' : 'Add segment'}
            </button>
          </div>
        </section>

        {/* Itinerary */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Itinerary
          </h2>
          {sortedDayKeys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No segments yet. Add flights, stays, transport, or activities
              above.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDayKeys.map((dayKey) => {
                const daySegments = segmentsByDay[dayKey];
                const dateLabel = new Date(dayKey).toLocaleDateString();

                return (
                  <div key={dayKey}>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-200" />
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {dateLabel}
                      </div>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <div className="space-y-2">
                      {daySegments.map((s) => {
                        const meta = getSegmentMeta(s.type);
                        return (
                          <div
                            key={s.id}
                            className="flex items-stretch justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
                          >
                            <div className="flex flex-1 gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg">
                                {meta.icon}
                              </div>
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {s.title}
                                  </span>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}
                                  >
                                    {meta.label}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600">
                                  {new Date(
                                    s.startTime,
                                  ).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {s.endTime &&
                                    ` – ${new Date(
                                      s.endTime,
                                    ).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`}
                                </div>
                                {(s.location || s.provider) && (
                                  <div className="mt-1 text-xs text-slate-500">
                                    {s.location}
                                    {s.location && s.provider && ' · '}
                                    {s.provider}
                                  </div>
                                )}
                                {s.confirmationCode && (
                                  <div className="mt-1 text-[11px] text-slate-400">
                                    Ref: {s.confirmationCode}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col justify-center gap-1 text-[11px] text-slate-600">
                              <button
                                type="button"
                                onClick={() => handleEditSegment(s)}
                                className="rounded-full px-2 py-1 hover:bg-slate-100 hover:text-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSegment(s)}
                                className="rounded-full px-2 py-1 hover:bg-slate-100 hover:text-red-700"
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
      </main>
    </div>
  );
}
