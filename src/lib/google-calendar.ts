import { google } from "googleapis";

import { getGoogleEnv } from "@/lib/env";

type GoogleConnection = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

type BusyRange = {
  start?: string | null;
  end?: string | null;
};

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  description: string | null;
  attendees: string[];
};

const GOOGLE_MAX_RETRIES = 3;
const GOOGLE_RETRY_DELAYS_MS = [150, 500, 1200] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryGoogleError(error: unknown) {
  const candidate = error as {
    code?: number;
    status?: number;
    message?: string;
  };

  const status = candidate.code ?? candidate.status;
  if (status === 429 || status === 500 || status === 502 || status === 503) {
    return true;
  }

  const message = (candidate.message ?? "").toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("temporar")
  );
}

async function withGoogleRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= GOOGLE_MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= GOOGLE_MAX_RETRIES || !shouldRetryGoogleError(error)) {
        throw error;
      }

      await sleep(GOOGLE_RETRY_DELAYS_MS[attempt - 1] ?? 1200);
    }
  }

  throw lastError;
}

function getRedirectUri() {
  const env = getGoogleEnv();
  return `${env.NEXT_PUBLIC_APP_URL}/api/google/callback`;
}

export function createGoogleOAuthClient() {
  const env = getGoogleEnv();

  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    getRedirectUri(),
  );
}

export function getGoogleAuthUrl(state: string) {
  const client = createGoogleOAuthClient();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data } = await oauth2.userinfo.get();

  return {
    tokens,
    email: data.email ?? null,
  };
}

async function getAuthorizedClient(connection: GoogleConnection) {
  const client = createGoogleOAuthClient();
  client.setCredentials({
    access_token: connection.access_token ?? undefined,
    refresh_token: connection.refresh_token ?? undefined,
    expiry_date: connection.expires_at
      ? new Date(connection.expires_at).getTime()
      : undefined,
  });

  return client;
}

export async function getGoogleBusyRanges(
  connection: GoogleConnection,
  timeMin: string,
  timeMax: string,
) {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });
  const { data } = await withGoogleRetry(() =>
    calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      },
    }),
  );

  return (data.calendars?.primary?.busy ?? []) as BusyRange[];
}

export async function createGoogleCalendarEvent(
  connection: GoogleConnection,
  input: {
    summary: string;
    description: string;
    start: string;
    end: string;
    attendees?: string[];
  },
) {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });

  const response = await withGoogleRetry(() =>
    calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start },
        end: { dateTime: input.end },
        attendees: (input.attendees ?? [])
          .filter((email) => Boolean(email))
          .map((email) => ({ email })),
      },
    }),
  );

  return response.data.id ?? null;
}

export async function deleteGoogleCalendarEvent(
  connection: GoogleConnection,
  eventId: string,
) {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });

  await withGoogleRetry(() =>
    calendar.events.delete({
      calendarId: "primary",
      eventId,
    }),
  );
}

export async function listGoogleCalendarEvents(
  connection: GoogleConnection,
  timeMin: string,
  timeMax: string,
) {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });

  const { data } = await withGoogleRetry(() =>
    calendar.events.list({
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      timeMin,
      timeMax,
      maxResults: 250,
    }),
  );

  return (data.items ?? [])
    .map((event) => {
      const start = event.start?.dateTime ?? event.start?.date;
      const end = event.end?.dateTime ?? event.end?.date;

      if (!event.id || !start || !end) {
        return null;
      }

      return {
        id: event.id,
        summary: event.summary ?? "Consulta",
        start,
        end,
        description: event.description ?? null,
        attendees: (event.attendees ?? [])
          .map((attendee) => attendee.email ?? "")
          .filter((email) => Boolean(email)),
      } satisfies GoogleCalendarEvent;
    })
    .filter((event): event is GoogleCalendarEvent => Boolean(event));
}
