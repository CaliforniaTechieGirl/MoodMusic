import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { playlistRequestSchema } from "@shared/schema";
import { ZodError } from "zod";
import {
  buildSpotifyAuthUrl,
  storeExportState,
  consumeExportState,
  exportToSpotify,
} from "./spotify";

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate playlist
  app.post('/api/playlist/generate', async (req, res) => {
    try {
      const validatedRequest = playlistRequestSchema.parse(req.body);
      const playlist = await storage.generatePlaylist(validatedRequest);
      res.json(playlist);
    } catch (error) {
      console.error('Error generating playlist:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to generate playlist" });
    }
  });

  // Initiate Spotify OAuth — stores playlist data and returns the auth URL
  app.post('/api/spotify/initiate', (req, res) => {
    try {
      const { playlistName, tracks } = req.body;
      if (!playlistName || !Array.isArray(tracks)) {
        return res.status(400).json({ message: "Missing playlistName or tracks" });
      }
      if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        return res.status(503).json({ message: "Spotify credentials not configured" });
      }

      const state = randomBytes(16).toString('hex');
      storeExportState(state, playlistName, tracks);
      const authUrl = buildSpotifyAuthUrl(state);

      res.json({ authUrl });
    } catch (error) {
      console.error('[Spotify] Initiate error:', error);
      res.status(500).json({ message: "Failed to initiate Spotify export" });
    }
  });

  // Spotify OAuth callback
  app.get('/callback', async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      return res.send(callbackPage(false, null, `Spotify denied access: ${error}`));
    }

    if (!code || !state) {
      return res.send(callbackPage(false, null, "Missing code or state parameter"));
    }

    const pending = consumeExportState(state);
    if (!pending) {
      return res.send(callbackPage(false, null, "Session expired or invalid. Please try again."));
    }

    try {
      const result = await exportToSpotify(code, pending.playlistName, pending.tracks);
      res.send(callbackPage(true, result, null));
    } catch (err: any) {
      console.error('[Spotify] Export error:', err);
      res.send(callbackPage(false, null, err.message || "Failed to create Spotify playlist"));
    }
  });

  // Fetch songs (kept for potential future use)
  app.get('/api/songs', async (req, res) => {
    try {
      const songs = await storage.getSongs();
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Generates the HTML page shown after the OAuth callback
function callbackPage(
  success: boolean,
  result: { playlistUrl: string; tracksAdded: number; tracksFailed: number; failedTracks: string[] } | null,
  errorMessage: string | null
): string {
  const message = success && result
    ? JSON.stringify({ success: true, playlistUrl: result.playlistUrl, tracksAdded: result.tracksAdded, tracksFailed: result.tracksFailed, failedTracks: result.failedTracks })
    : JSON.stringify({ success: false, error: errorMessage });

  return `<!DOCTYPE html>
<html>
<head>
  <title>Spotify Export</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #191414; color: white; text-align: center; padding: 20px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { margin: 0 0 8px; }
    p { color: #b3b3b3; margin: 0 0 20px; }
    a { color: #1DB954; text-decoration: none; font-weight: bold; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div>
    <div class="icon">${success ? '🎵' : '❌'}</div>
    <h2>${success ? 'Playlist created!' : 'Something went wrong'}</h2>
    ${success && result
      ? `<p>${result.tracksAdded} tracks added${result.tracksFailed > 0 ? `, ${result.tracksFailed} not found on Spotify` : ''}.</p>
         <p style="margin-top:16px;font-size:15px;color:#1DB954;font-weight:bold">You can now open in Spotify.</p>
         <p style="margin-top:8px;font-size:13px;color:#555">Close this window to see the button.</p>`
      : `<p>${errorMessage || 'Unknown error'}</p>
         <p style="margin-top:24px;font-size:14px;color:#555">You can close this window.</p>`
    }
  </div>
  <script>
    // Send result back to the opener window, then close
    const payload = ${message};
    if (window.opener) {
      window.opener.postMessage(payload, '*');
    }
    // Auto-close after a short delay so user can read the message
    setTimeout(() => window.close(), 3000);
  </script>
</body>
</html>`;
}
