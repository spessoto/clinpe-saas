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
  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: "primary" }],
    },
  });

  return (data.calendars?.primary?.busy ?? []) as BusyRange[];
}

export async function createGoogleCalendarEvent(
  connection: GoogleConnection,
  input: {
    summary: string;
    description: string;
    start: string;
    end: string;
  },
) {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });

  await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start },
      end: { dateTime: input.end },
    },
  });
}
