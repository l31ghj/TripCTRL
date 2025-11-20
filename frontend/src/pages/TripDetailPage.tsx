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

export function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [segmentForm, setSegmentForm] =
    useState<SegmentFormState>(emptySegmentForm);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [segmentError, setSegmentError] = useState<string | null>(null);

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
    Object.values(groups).forEach(list =>
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
    if (!confirm('Delete this trip and all its segments?')) return;
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
    setSegmentForm(prev => ({ ...prev, [key]: value }));
  }

  function toIso(dtLocal: string): string | undefined {
    if (!dtLocal) return undefined;
    return new Date(dtLocal).toISOString();
  }

  async function handleSegmentSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          segments: trip.segments.map(s =>
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
    if (!confirm('Delete this segment?')) return;
    try {
      await deleteSegment(seg.id);
      setTrip({
        ...trip,
        segments: trip.segments.filter(s => s.id !== seg.id),
      });
    } catch (err: any) {
      setSegmentError(err.message ?? 'Failed to delete segment');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <NavBar />
        <div className="p-4">Loading trip...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100">
        <NavBar />
        <div className="p-4 text-red-600">{error}</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-100">
        <NavBar />
        <div className="p-4">Trip not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <section className="bg-white border rounded p-4">
          <h1 className="text-2xl font-bold mb-2">Trip details</h1>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Title</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Main location
              </label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Start date
              </label>
              <input
                type="date"
                className="border rounded px-2 py-1 w-full"
                value={editStartDate}
                onChange={e => setEditStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                End date
              </label>
              <input
                type="date"
                className="border rounded px-2 py-1 w-full"
                value={editEndDate}
                onChange={e => setEditEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm text-gray-700 mb-1">Notes</label>
            <textarea
              className="border rounded px-2 py-1 w-full"
              rows={3}
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleUpdateTrip}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1 rounded"
            >
              Save changes
            </button>
            <button
              onClick={handleDeleteTrip}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-1 rounded"
            >
              Delete trip
            </button>
          </div>
        </section>

        <section className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-2">
            {editingSegmentId ? 'Edit segment' : 'Add segment'}
          </h2>
          {segmentError && (
            <div className="mb-2 text-sm text-red-600">{segmentError}</div>
          )}
          <form
            onSubmit={handleSegmentSubmit}
            className="grid md:grid-cols-2 gap-3"
          >
            <div>
              <label className="block text-sm text-gray-700 mb-1">Type</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={segmentForm.type}
                onChange={e =>
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
              <label className="block text-sm text-gray-700 mb-1">Title</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={segmentForm.title}
                onChange={e =>
                  handleSegmentFieldChange('title', e.target.value)
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Start time
              </label>
              <input
                type="datetime-local"
                className="border rounded px-2 py-1 w-full"
                value={segmentForm.startTime}
                onChange={e =>
                  handleSegmentFieldChange('startTime', e.target.value)
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                End time
              </label>
              <input
                type="datetime-local"
                className="border rounded px-2 py-1 w-full"
                value={segmentForm.endTime}
                onChange={e =>
                  handleSegmentFieldChange('endTime', e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Location
              </label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={segmentForm.location}
                onChange={e =>
                  handleSegmentFieldChange('location', e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Provider
              </label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={segmentForm.provider}
                onChange={e =>
                  handleSegmentFieldChange('provider', e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Confirmation code
              </label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={segmentForm.confirmationCode}
                onChange={e =>
                  handleSegmentFieldChange(
                    'confirmationCode',
                    e.target.value,
                  )
                }
              />
            </div>
          </form>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSegmentSubmit as any}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1 rounded"
            >
              {editingSegmentId ? 'Save segment' : 'Add segment'}
            </button>
            {editingSegmentId && (
              <button
                onClick={resetSegmentForm}
                className="text-sm text-gray-700 underline"
              >
                Cancel edit
              </button>
            )}
          </div>
        </section>

        <section className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Itinerary</h2>
          {sortedDayKeys.length === 0 && (
            <div className="text-sm text-gray-500">No segments yet.</div>
          )}
          <div className="space-y-4">
            {sortedDayKeys.map(dayKey => {
              const daySegments = segmentsByDay[dayKey];
              const dateLabel = new Date(dayKey).toLocaleDateString();
              return (
                <div key={dayKey}>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    {dateLabel}
                  </div>
                  <div className="space-y-2">
                    {daySegments.map(s => (
                      <div
                        key={s.id}
                        className="border rounded p-3 bg-slate-50 flex justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs uppercase text-gray-500 mb-1">
                            {s.type}
                          </div>
                          <div className="font-semibold">{s.title}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(s.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {s.endTime &&
                              ` – ${new Date(s.endTime).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' },
                              )}`}
                          </div>
                          {(s.location || s.provider) && (
                            <div className="text-sm text-gray-500 mt-1">
                              {s.location}{' '}
                              {s.provider && `· ${s.provider}`}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 text-xs">
                          <button
                            onClick={() => handleEditSegment(s)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSegment(s)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
