import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trip, Segment, getTrip } from '../api/trips';
import { buildImageUrl } from '../api/client';
import { NavBar } from '../components/NavBar';

type TripDetail = Awaited<ReturnType<typeof getTrip>>;

function renderTimeRange(start: string, end?: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!endDate) return fmtTime(startDate);
  return `${fmtTime(startDate)} - ${fmtTime(endDate)}`;
}

export function TripPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getTrip(id);
        setTrip(data);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError('Unable to load trip for print');
      } finally {
        setLoading(false);
      }
    })();
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

  const sortedDayKeys = useMemo(() => Object.keys(segmentsByDay).sort(), [segmentsByDay]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-800">
        <NavBar />
        <main className="mx-auto flex max-w-5xl flex-1 items-center justify-center px-4 py-10">
          <p className="text-sm text-slate-500">Preparing print view...</p>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-white text-slate-800">
        <NavBar />
        <main className="mx-auto flex max-w-5xl flex-1 items-center justify-center px-4 py-10">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || 'Trip not found'}
          </div>
        </main>
      </div>
    );
  }

  const imageUrl = buildImageUrl(trip.imagePath);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <NavBar />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 print:max-w-4xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{trip.title}</h1>
            <p className="text-sm text-slate-600">
              {new Date(trip.startDate).toLocaleDateString()} –{' '}
              {new Date(trip.endDate).toLocaleDateString()}
            </p>
            {trip.mainLocation && (
              <p className="text-sm text-slate-600">Location: {trip.mainLocation}</p>
            )}
            {trip.owner && (
              <p className="text-xs text-slate-500">Owner: {trip.owner.email}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 print:hidden"
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-500 hover:bg-slate-100 print:hidden"
            >
              Back
            </button>
          </div>
        </div>

        {imageUrl && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <img src={imageUrl} alt={trip.title} className="h-56 w-full object-cover" />
          </div>
        )}

        {trip.notes && (
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm print:border-slate-300 print:bg-white">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Trip notes
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{trip.notes}</p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:border-slate-300">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Itinerary</h2>
            <span className="text-[11px] text-slate-500">Sorted by day</span>
          </div>

          {sortedDayKeys.length === 0 ? (
            <p className="text-sm text-slate-500">No segments yet.</p>
          ) : (
            <div className="space-y-4">
              {sortedDayKeys.map((dayKey) => {
                const daySegments = segmentsByDay[dayKey];
                const date = new Date(dayKey);
                const dateLabel = date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <div
                    key={dayKey}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm print:border-slate-300 print:bg-white"
                  >
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>{dateLabel}</span>
                      <span className="text-xs text-slate-500">
                        {daySegments.length} item{daySegments.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {daySegments.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm print:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {s.type}
                              </div>
                              <div className="text-sm font-semibold text-slate-900">
                                {s.title || s.provider || 'Untitled'}
                              </div>
                              {s.location && (
                                <div className="text-[11px] text-slate-600">Location: {s.location}</div>
                              )}
                              {s.confirmationCode && (
                                <div className="text-[11px] text-slate-500">Ref: {s.confirmationCode}</div>
                              )}
                            </div>
                            <div className="text-right text-[11px] text-slate-600">
                              {renderTimeRange(s.startTime, s.endTime)}
                            </div>
                          </div>
                        </div>
                      ))}
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
