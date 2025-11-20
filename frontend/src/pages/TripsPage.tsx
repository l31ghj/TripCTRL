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
        setError(err.message ?? 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onCreate() {
    if (!newTitle || !startDate || !endDate) return;
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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <NavBar />
        <div className="p-4">Loading trips...</div>
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

  return (
    <div className="min-h-screen bg-slate-100">
      <NavBar />
      <div className="max-w-3xl mx-auto p-4">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">My Trips</h1>
        </header>

        <section className="mb-6 border rounded p-4 bg-slate-50">
          <h2 className="font-semibold mb-2">New trip</h2>
          <div className="grid gap-2 md:grid-cols-4">
            <input
              placeholder="Title"
              className="border rounded px-2 py-1"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              placeholder="Main location"
              className="border rounded px-2 py-1"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={onCreate}
            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1 rounded"
          >
            Add trip
          </button>
        </section>

        <section className="space-y-3">
          {trips.map((t) => (
            <div
              key={t.id}
              className="border rounded p-3 hover:bg-slate-50 cursor-pointer"
              onClick={() => navigate(`/trips/${t.id}`)}
            >
              <div className="font-semibold">{t.title}</div>
              <div className="text-sm text-gray-600">
                {t.mainLocation} ·{' '}
                {new Date(t.startDate).toLocaleDateString()} –{' '}
                {new Date(t.endDate).toLocaleDateString()}
              </div>
            </div>
          ))}
          {trips.length === 0 && (
            <div className="text-sm text-gray-500">No trips yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
