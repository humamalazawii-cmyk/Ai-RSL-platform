/**
 * Google Drive OAuth + Client
 * ============================================
 * Handles OAuth 2.0 flow with Google for Drive access.
 *
 * Flow:
 *   1. generateAuthUrl() → user clicks to start OAuth
 *   2. exchangeCodeForTokens() → callback receives code, exchanges for tokens
 *   3. saveTokens() → encrypts and saves to DB
 *   4. getAuthenticatedDriveClient() → returns ready-to-use Drive client
 *      (auto-refreshes access token if expired)
 *   5. downloadDriveFile() → streams file from Drive to local disk
 */

import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from './db';
import { encryptToken, decryptToken } from './oauth-crypto';

// ============================================
// Configuration
// ============================================

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Production URL — hardcoded because we only support production.
 * See OAuth client setup in Google Cloud Console.
 */
const REDIRECT_URI =
  'https://rsl-ai-284761901690.me-central1.run.app/api/rsl-vault/oauth/callback';

// ============================================
// OAuth Client Factory
// ============================================

/**
 * Create a fresh OAuth2Client from env vars.
 * Client ID/Secret come from Secret Manager (injected as env vars in Cloud Run).
 */
function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET env vars not set'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

// ============================================
// Public API — OAuth Flow
// ============================================

/**
 * Step 1: Generate authorization URL.
 * Redirect user here to start OAuth consent.
 *
 * @param state - CSRF protection token (stored in cookie, verified on callback)
 */
export function generateAuthUrl(state: string): string {
  const client = createOAuthClient();

  return client.generateAuthUrl({
    access_type: 'offline', // Required to get refresh_token
    prompt: 'consent', // Force consent screen (ensures refresh_token)
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

/**
 * Step 2: Exchange authorization code for tokens.
 * Called on OAuth callback.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresAt: Date;
  providerEmail: string;
}> {
  const client = createOAuthClient();

  // Exchange code for tokens
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error(
      'Missing access_token or refresh_token from Google. Did user grant offline access?'
    );
  }

  // Get user email (to know which Google account they connected)
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: client, version: 'v2' });
  const userInfo = await oauth2.userinfo.get();

  if (!userInfo.data.email) {
    throw new Error('Could not retrieve email from Google userinfo');
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    scope: tokens.scope ?? SCOPES.join(' '),
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    providerEmail: userInfo.data.email,
  };
}

/**
 * Step 3: Save tokens to DB (encrypted).
 * Upsert: overwrites existing token for this user.
 */
export async function saveTokens(
  userEmail: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    scope: string;
    expiresAt: Date;
    providerEmail: string;
  }
): Promise<void> {
  const encryptedAccess = encryptToken(tokens.accessToken);
  const encryptedRefresh = encryptToken(tokens.refreshToken);

  await prisma.oAuthToken.upsert({
    where: {
      userEmail_provider: {
        userEmail: userEmail.toLowerCase(),
        provider: 'GOOGLE',
      },
    },
    create: {
      userEmail: userEmail.toLowerCase(),
      provider: 'GOOGLE',
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      scope: tokens.scope,
      expiresAt: tokens.expiresAt,
      providerEmail: tokens.providerEmail,
    },
    update: {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      scope: tokens.scope,
      expiresAt: tokens.expiresAt,
      providerEmail: tokens.providerEmail,
    },
  });
}

// ============================================
// Public API — Using Drive
// ============================================

/**
 * Get a ready-to-use Drive client for a user.
 * Auto-refreshes access token if expired.
 *
 * Returns null if user hasn't connected Drive yet.
 */
export async function getAuthenticatedDriveClient(
  userEmail: string
): Promise<drive_v3.Drive | null> {
  const token = await prisma.oAuthToken.findUnique({
    where: {
      userEmail_provider: {
        userEmail: userEmail.toLowerCase(),
        provider: 'GOOGLE',
      },
    },
  });

  if (!token) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: decryptToken(token.accessToken),
    refresh_token: decryptToken(token.refreshToken),
    expiry_date: token.expiresAt.getTime(),
  });

  // Auto-refresh if expired (google-auth-library handles this)
  // Listen for token refresh events to save new access_token
  client.on('tokens', async (newTokens) => {
    if (newTokens.access_token) {
      await prisma.oAuthToken.update({
        where: {
          userEmail_provider: {
            userEmail: userEmail.toLowerCase(),
            provider: 'GOOGLE',
          },
        },
        data: {
          accessToken: encryptToken(newTokens.access_token),
          expiresAt: new Date(newTokens.expiry_date ?? Date.now() + 3600 * 1000),
          lastUsedAt: new Date(),
        },
      });
    }
  });

  return google.drive({ version: 'v3', auth: client });
}

/**
 * Check if a user has connected Google Drive.
 * Returns connection metadata (no tokens).
 */
export async function getConnectionStatus(userEmail: string): Promise<{
  connected: boolean;
  providerEmail?: string;
  connectedAt?: Date;
  lastUsedAt?: Date | null;
}> {
  const token = await prisma.oAuthToken.findUnique({
    where: {
      userEmail_provider: {
        userEmail: userEmail.toLowerCase(),
        provider: 'GOOGLE',
      },
    },
    select: {
      providerEmail: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  if (!token) return { connected: false };

  return {
    connected: true,
    providerEmail: token.providerEmail ?? undefined,
    connectedAt: token.createdAt,
    lastUsedAt: token.lastUsedAt,
  };
}

/**
 * Disconnect: delete token from DB.
 */
export async function disconnectDrive(userEmail: string): Promise<void> {
  await prisma.oAuthToken
    .delete({
      where: {
        userEmail_provider: {
          userEmail: userEmail.toLowerCase(),
          provider: 'GOOGLE',
        },
      },
    })
    .catch(() => {
      // Ignore if doesn't exist
    });
}

/**
 * Download a file from Google Drive to a local path.
 *
 * Uses the user's OAuth token (managed by getAuthenticatedDriveClient).
 * Streams the response to disk instead of buffering in memory —
 * critical for large meeting recordings (100MB-1GB).
 *
 * @param userEmail - Owner of the Drive token
 * @param fileId - Google Drive file ID
 * @param destPath - Local path to write to
 * @returns File size in bytes
 *
 * @throws Error if user has no Drive connection, file not found, or download fails
 */
export async function downloadDriveFile(
  userEmail: string,
  fileId: string,
  destPath: string
): Promise<number> {
  const drive = await getAuthenticatedDriveClient(userEmail);

  if (!drive) {
    throw new Error(
      `No Google Drive connection for user ${userEmail}. ` +
        `User must connect Drive first via /rsl-vault.`
    );
  }

  // Stream the file body to disk
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  const fs = await import('fs');
  const writeStream = fs.createWriteStream(destPath);

  return new Promise<number>((resolve, reject) => {
    let bytesWritten = 0;

    const stream = response.data;

    stream.on('data', (chunk: Buffer) => {
      bytesWritten += chunk.length;
    });

    stream.on('error', (err: Error) => {
      writeStream.destroy();
      reject(new Error(`Drive download failed: ${err.message}`));
    });

    stream.pipe(writeStream);

    writeStream.on('error', (err: Error) => {
      reject(new Error(`Write to disk failed: ${err.message}`));
    });

    writeStream.on('finish', () => {
      console.log(
        `[Drive] Downloaded ${(bytesWritten / 1024 / 1024).toFixed(2)}MB ` +
          `(file ${fileId}) -> ${destPath}`
      );
      resolve(bytesWritten);
    });
  });
}
