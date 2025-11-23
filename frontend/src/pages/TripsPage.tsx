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

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPastTrips, setShowPastTrips] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listTrips();
        setTrips(data);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? 'Failed to load trips');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreateTrip(e: any) {
    e.preventDefault();
    if (!newTitle || !startDate || !endDate) return;

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
      setShowCreateForm(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to create trip');
    }
  }

  const hasTrips = trips.length > 0;

  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const upcomingAndCurrentTrips = sortedTrips.filter(
    (t) => getTripStatus(t) !== 'past',
  );
  const pastTrips = sortedTrips.filter((t) => getTripStatus(t) === 'past');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <NavBar />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-10 pt-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700/50 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Create trip */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Create a new trip
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add a new itinerary with dates and an optional main location.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {showCreateForm ? 'Hide form' : 'New trip'}
            </button>
          </div>

          {showCreateForm && (
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Tokyo, London, New York…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Start date
                </label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  End date
                </label>
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                >
                  Save trip
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Trips list */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Your trips
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Browse upcoming, active, and past trips.
              </p>
            </div>
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
              <p>No trips yet. Use the &ldquo;New trip&rdquo; button above to create your first trip.</p>
            </div>
          )}

          {!loading && hasTrips && (
            <div className="space-y-6">
              {upcomingAndCurrentTrips.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {upcomingAndCurrentTrips.map((trip) => {
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
                        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-md ring-1 ring-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-sky-500/25 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-sky-400/80"
                      >
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
                              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 transition group-hover:text-blue-700 dark:text-slate-50 dark:group-hover:text-blue-300">
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
                                <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-100 shadow-sm dark:bg-slate-700 dark:text-slate-200 dark:group-hover:bg-slate-600">
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

              {pastTrips.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Past trips
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPastTrips((prev) => !prev)}
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {showPastTrips ? 'Hide past trips' : 'Show past trips'}
                    </button>
                  </div>

                  {showPastTrips && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {pastTrips.map((trip) => {
                        const imageUrl = buildImageUrl(trip.imagePath);
                        const start = new Date(trip.startDate);
                        const end = new Date(trip.endDate);

                        const statusLabel = 'Completed';
                        const statusClass =
                          'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60';

                        return (
                          <button
                            key={trip.id}
                            type="button"
                            onClick={() => navigate(`/trips/${trip.id}`)}
                            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/80 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-blue-400/80"
                          >
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
                                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 transition group-hover:text-blue-700 dark:text-slate-50 dark:group-hover:text-blue-300">
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
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}