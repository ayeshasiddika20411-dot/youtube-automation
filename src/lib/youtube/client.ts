import { google } from "googleapis";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

function getClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables."
    );
  }
  return { clientId, clientSecret };
}

/** Create an OAuth2 client. Pass refreshToken to authorize a user. */
export function createOAuth2Client(refreshToken?: string) {
  const { clientId, clientSecret } = getClientConfig();
  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/youtube/oauth/callback`;

  const client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  if (refreshToken) {
    client.setCredentials({ refresh_token: refreshToken });
  }

  return client;
}

/** Build the authorization URL for the OAuth2 consent screen */
export function buildAuthUrl(client: ReturnType<typeof createOAuth2Client>, state: string) {
  return client.generateAuthUrl({
    access_type: "offline",
    scope: YOUTUBE_SCOPES,
    prompt: "consent",
    state,
  });
}

/** Exchange an authorization code for tokens */
export async function exchangeCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/** Create a YouTube API instance for an authenticated user */
export function createYoutube(accessToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ access_token: accessToken });
  return google.youtube({ version: "v3", auth: client });
}
