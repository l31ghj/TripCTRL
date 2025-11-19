import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTrip, Segment } from '../api/trips';

export function TripDetailPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getTrip(id);
        setTrip(data);
      } catch (err: any) {
        setError(err.message ?? 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-4">Loading trip...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!trip) return <div className="p-4">Trip not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-1">TripCTRL – {trip.title}</h1>
      <div className="text-sm text-gray-600 mb-4">
        {trip.mainLocation} ·{' '}
        {new Date(trip.startDate).toLocaleDateString()} –{' '}
        {new Date(trip.endDate).toLocaleDateString()}
      </div>

      <h2 className="font-semibold mb-2">Itinerary</h2>
      <div className="space-y-2">
        {trip.segments && trip.segments.length > 0 ? (
          trip.segments.map((s: Segment) => (
            <div key={s.id} className="border rounded p-3 bg-white">
              <div className="text-xs uppercase text-gray-500 mb-1">
                {s.type}
              </div>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-gray-600">
                {new Date(s.startTime).toLocaleString()}
                {s.endTime && ` – ${new Date(s.endTime).toLocaleString()}`}
              </div>
              {(s.location || s.provider) && (
                <div className="text-sm text-gray-500 mt-1">
                  {s.location} {s.provider && `· ${s.provider}`}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500">No segments yet.</div>
        )}
      </div>
    </div>
  );
}
