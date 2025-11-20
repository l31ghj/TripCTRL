import { useEffect, useState } from 'react';
import { Trip, listTrips, createTrip } from '../api/trips';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { buildImageUrl } from '../api/client';

function getTripStatus(trip: Trip): 'upcoming' | 'in-progress' | 'past' {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const now = new Date();
  if (end < now) return 'past';
  if (start <= now && end >= now) return 'in-progress';
  return 'upcoming';
}

function getDaysUntilStart(trip: Trip): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(trip.startDate);
  start.setHours(0, 0, 0, 0);
  const diffMs = start.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

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

  async function handleCreateTrip(e: any) {
    e.preventDefault();
    setError(null);
    try {
      const trip = await createTrip({
        title: newTitle,
        mainLocation: newLocation || undefined,
        startDate,
        endDate,
        notes: undefined,
      });
      setTrips((prev) => [...prev, trip]);
      setNewTitle('');
      setNewLocation('');
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create trip');
    }
  }

  const hasTrips = trips.length > 0;

  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <NavBar />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-10 pt-6">
        {/* Hero / heading */}
        <section className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500 p-6 text-white shadow-lg">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Your trips, under control.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-blue-100">
            Plan flights, stays and activities in one clean itinerary. Add new trips,
            then drill into the details as you go.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600/60 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Create trip form */}
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Create a new trip
          </h2>
          <form
            onSubmit={handleCreateTrip}
            className="mt-3 grid gap-3 md:grid-cols-2 md:gap-4"
          >
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Trip title
              </label>
              <input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                placeholder="Japan adventure, Europe 2026, Work trip to Sydney…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Main location (optional)
              </label>
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                placeholder="Tokyo, London, New York…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Start date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                End date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
              >
                <span>+ Add trip</span>
              </button>
            </div>
          </form>
        </section>

        {/* Trips list */}
        <section className="flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Your trips
            </h2>
            {hasTrips && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {sortedTrips.length} trip{sortedTrips.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              Loading trips…
            </div>
          )}

          {!loading && !hasTrips && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
              <p>No trips yet. Create your first trip above to get started.</p>
            </div>
          )}

          {!loading && hasTrips && (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedTrips.map((trip) => {
                const status = getTripStatus(trip);
                const daysUntil = getDaysUntilStart(trip);
                const imageUrl = buildImageUrl(trip.imagePath);
                const start = new Date(trip.startDate);
                const end = new Date(trip.endDate);

                let statusLabel = 'Upcoming';
                let statusClass =
                  'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/60';

                if (status === 'in-progress') {
                  statusLabel = 'In progress';
                  statusClass =
                    'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700/60';
                } else if (status === 'past') {
                  statusLabel = 'Completed';
                  statusClass =
                    'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60';
                }

                let countdownLabel: string | null = null;
                if (status === 'upcoming') {
                  if (daysUntil <= 0) {
                    countdownLabel = 'Starts today';
                  } else if (daysUntil === 1) {
                    countdownLabel = 'Starts in 1 day';
                  } else {
                    countdownLabel = `Starts in ${daysUntil} days`;
                  }
                }

                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/80 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-blue-400/80"
                  >
                    {/* Image */}
                    {imageUrl && (
                      <div className="relative h-32 w-full overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={trip.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-blue-700 dark:text-slate-50 dark:group-hover:text-blue-300">
                            {trip.title}
                          </h3>
                          {trip.mainLocation && (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {trip.mainLocation}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                          {countdownLabel && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 dark:bg-slate-700 dark:text-slate-200 dark:group-hover:bg-slate-600">
                              ⏳ {countdownLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          <div>
                            {start.toLocaleDateString()} – {end.toLocaleDateString()}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Click to view itinerary
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
