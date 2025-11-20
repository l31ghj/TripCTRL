import { useEffect, useState } from 'react';
import { Trip, listTrips, createTrip } from '../api/trips';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/NavBar';

export function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await listTrips();
        setTrips(data);
      } catch (err: any) {
        setError(err.message ?? 'Error loading trips');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onCreate() {
    if (!newTitle || !startDate || !endDate) return;

    try {
      const trip = await createTrip({
        title: newTitle,
        mainLocation: newLocation || undefined,
        startDate,
        endDate,
      });
      setTrips((prev) => [...prev, trip]);
      setNewTitle('');
      setNewLocation('');
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      setError(err.message ?? 'Error creating trip');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        {/* Hero header */}
        <section className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-6 py-5 text-white shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your trips, under control.
          </h1>
          <p className="mt-1 text-sm text-blue-50">
            Create trips, build day-by-day itineraries, and keep everything in one place.
          </p>
        </section>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* New trip form */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Create a new trip
              </h2>
              <p className="text-xs text-slate-500">
                Add a title, optional main location, and start/end dates.
              </p>
            </div>

            <div className="grid w-full gap-2 md:grid-cols-4 md:w-auto">
              <input
                placeholder="Trip title"
                className="h-9 rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <input
                placeholder="Main location"
                className="h-9 rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
              <input
                type="date"
                className="h-9 rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                className="h-9 rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={onCreate}
              className="h-9 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Add trip
            </button>
          </div>
        </section>

        {/* Loading state */}
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
            Loading trips…
          </div>
        )}

        {/* Trip grid */}
        {!loading && (
          <section>
            {trips.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No trips yet. Use the form above to create your first trip.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {trips.map((t) => {
                  const start = new Date(t.startDate);
                  const end = new Date(t.endDate);
                  const now = new Date();

                  let status: 'upcoming' | 'in-progress' | 'past' = 'upcoming';
                  if (end < now) status = 'past';
                  else if (start <= now && end >= now) status = 'in-progress';

                  const statusStyles: Record<typeof status, string> = {
                    upcoming:
                      'bg-emerald-50 text-emerald-700 border-emerald-100',
                    'in-progress':
                      'bg-blue-50 text-blue-700 border-blue-100',
                    past: 'bg-slate-100 text-slate-600 border-slate-200',
                  };

                  const statusLabel: Record<typeof status, string> = {
                    upcoming: 'Upcoming',
                    'in-progress': 'In progress',
                    past: 'Completed',
                  };

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate(`/trips/${t.id}`)}
                      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="flex-1 truncate text-base font-semibold text-slate-900">
                          {t.title}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}
                        >
                          {statusLabel[status]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.mainLocation && (
                          <div className="mb-0.5 font-medium text-slate-700">
                            {t.mainLocation}
                          </div>
                        )}
                        <div>
                          {start.toLocaleDateString()} –{' '}
                          {end.toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
