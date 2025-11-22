import { useEffect, useState } from 'react';
import { Trip, listTrips, createTrip } from '../api/trips';
import { Link, useNavigate } from 'react-router-dom';
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
  const now = new Date();
  const start = new Date(trip.startDate);
  const diff = start.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getTripDurationDays(trip: Trip): number {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
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
  const [showPast, setShowPast] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await listTrips();
        setTrips(data);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load trips');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreateTrip(event: React.FormEvent) {
    event.preventDefault();
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
      setShowCreateForm(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create trip');
    }
  }

  const hasTrips = trips.length > 0;

  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const upcomingTrips = sortedTrips.filter(
    (trip) => getTripStatus(trip) !== 'past',
  );
  const pastTrips = sortedTrips.filter(
    (trip) => getTripStatus(trip) === 'past',
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <NavBar />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-10 pt-6">
        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600/60 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Create trip form (collapsible) */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Create a new trip
            </h2>
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span>{showCreateForm ? 'Hide form' : 'New trip'}</span>
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm outline-none ring-1 ring-transparent transition focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm outline-none ring-1 ring-transparent transition focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm outline-none ring-1 ring-transparent transition focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm outline-none ring-1 ring-transparent transition focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                >
                  <span>+ Add trip</span>
                </button>
              </div>
            </form>
          )}
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
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              Loading trips…
            </div>
          )}

          {!loading && !hasTrips && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p>No trips yet. Use the “New trip” button above to add your first itinerary.</p>
            </div>
          )}

          {!loading && hasTrips && (
            <div className="space-y-3">
              {/* Upcoming/in-progress trips */}
              {upcomingTrips.map((trip) => {
                const status = getTripStatus(trip);
                const daysUntil = getDaysUntilStart(trip);
                const duration = getTripDurationDays(trip);
                const coverUrl = buildImageUrl((trip as any).imagePath ?? null);

                return (
                  <Link
                    key={trip.id}
                    to={`/trips/${trip.id}`}
                    className="flex w-full items-stretch gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/90"
                  >
                    {coverUrl && (
                      <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900/10">
                        <img
                          src={coverUrl}
                          alt={trip.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {trip.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {trip.mainLocation || 'No main location set'}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          {status === 'upcoming' && (daysUntil > 0 ? `${daysUntil} days to go` : 'Starts today')}
                          {status === 'in-progress' && 'In progress'}
                          {status === 'past' && 'Past trip'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          {new Date(trip.startDate).toLocaleDateString()} –{' '}
                          {new Date(trip.endDate).toLocaleDateString()}
                        </span>
                        <span>{duration} days</span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Past trips */}
              {pastTrips.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowPast((prev) => !prev)}
                    className="mb-2 text-xs font-medium text-slate-600 underline hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                  >
                    {showPast ? 'Hide past trips' : `Show past trips (${pastTrips.length})`}
                  </button>
                  {showPast && (
                    <div className="space-y-3">
                      {pastTrips.map((trip) => {
                        const duration = getTripDurationDays(trip);
                        const coverUrl = buildImageUrl((trip as any).imagePath ?? null);

                        return (
                          <Link
                            key={trip.id}
                            to={`/trips/${trip.id}`}
                            className="flex w-full items-stretch gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80"
                          >
                            {coverUrl && (
                              <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900/10">
                                <img
                                  src={coverUrl}
                                  alt={trip.title}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex flex-1 flex-col justify-between gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                    {trip.title}
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {trip.mainLocation || 'No main location set'}
                                  </p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                  Past trip
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                <span>
                                  {new Date(trip.startDate).toLocaleDateString()} –{' '}
                                  {new Date(trip.endDate).toLocaleDateString()}
                                </span>
                                <span>{duration} days</span>
                              </div>
                            </div>
                          </Link>
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
