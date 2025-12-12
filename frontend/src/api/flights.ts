import { api } from './client';

export type FlightLookup = {
  found: boolean;
  data?: {
    flightStatus?: string | null;
    flightAirline?: string | null;
    flightDeparture?: any;
    flightArrival?: any;
    flightDelayMinutes?: number | null;
    flightGateDeparture?: string | null;
    flightGateArrival?: string | null;
    flightTerminalDep?: string | null;
    flightTerminalArr?: string | null;
    flightBaggage?: string | null;
    flightMeta?: any;
  };
};

export function lookupFlight(flightNumber: string, date: string) {
  return api<FlightLookup>(`/flights/lookup?flightNumber=${encodeURIComponent(flightNumber)}&date=${date}`);
}
