import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

type AeroFlight = {
  status?: string;
  airline?: { name?: string };
  departure?: {
    scheduledTimeLocal?: string;
    scheduledTimeUtc?: string;
    actualTimeUtc?: string;
    terminal?: string;
    gate?: string;
    airport?: { iata?: string; name?: string };
  };
  arrival?: {
    scheduledTimeLocal?: string;
    scheduledTimeUtc?: string;
    actualTimeUtc?: string;
    terminal?: string;
    gate?: string;
    baggage?: string;
    airport?: { iata?: string; name?: string };
  };
  lastUpdatedUtc?: string;
  isDelayed?: boolean;
  delay?: number;
  number?: string;
};

@Injectable()
export class FlightService {
  private readonly logger = new Logger(FlightService.name);
  // Default to API Market endpoint
  private readonly baseUrl = process.env.AERODATABOX_BASE_URL || 'https://apimarket.aerodatabox.com';

  constructor(private settings: SettingsService) {}

  private async getApiKey(): Promise<string | null> {
    const envKey = process.env.AERODATABOX_API_KEY;
    if (envKey) return envKey;
    return this.settings.get('AERODATABOX_API_KEY');
  }

  async fetchByNumberAndDate(flightNumber: string, date: string) {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.logger.warn('AERODATABOX_API_KEY missing; skipping flight enrichment');
      return null;
    }

    const url = `${this.baseUrl}/flights/number/${encodeURIComponent(flightNumber)}/${date}?withLeg=true`;
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/json',
      },
    });

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`AeroDataBox error ${res.status}: ${text}`);
      throw new Error(`AeroDataBox failed: ${res.status}`);
    }

    let data: { flights?: AeroFlight[] } | null = null;
    try {
      if (!isJson) {
        const text = await res.text();
        this.logger.error(`AeroDataBox non-JSON response: ${text.slice(0, 200)}`);
        throw new Error('Unexpected response from AeroDataBox');
      }
      data = (await res.json()) as { flights?: AeroFlight[] };
    } catch (err) {
      this.logger.error('Failed to parse AeroDataBox response', err as any);
      throw new Error('Failed to parse AeroDataBox response');
    }
    const flight = data?.flights?.[0];
    if (!flight) return null;

    return this.normalize(flight);
  }

  private normalize(f: AeroFlight) {
    return {
      flightStatus: f.status || null,
      flightAirline: f.airline?.name || null,
      flightDeparture: f.departure || null,
      flightArrival: f.arrival || null,
      flightDelayMinutes: typeof f.delay === 'number' ? Math.round(f.delay) : null,
      flightGateDeparture: f.departure?.gate || null,
      flightGateArrival: f.arrival?.gate || null,
      flightTerminalDep: f.departure?.terminal || null,
      flightTerminalArr: f.arrival?.terminal || null,
      flightBaggage: f.arrival?.baggage || null,
      flightMeta: f,
    };
  }
}
