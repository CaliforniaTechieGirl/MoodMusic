const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/';

async function apiCall(params: Record<string, string>): Promise<any> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error('LASTFM_API_KEY environment variable is not set');

  const url = new URL(LASTFM_API);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Last.fm HTTP error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`Last.fm API error ${json.error}: ${json.message}`);
  return json;
}

export interface LastFmTrackResult {
  title: string;
  artist: string;
  duration: number;
  url: string;
  matchScore: number;
  tagScore: number;
  decadeTagScore: number;
  nationalityTagScore: number;
}

const DECADE_TAGS = ['80s', '70s', '90s', '60s', '2000s', '2010s'];
const NATIONALITY_TAGS = ['canadian', 'british', 'australian', 'american', 'french', 'irish', 'swedish'];

/** Fetch duration (seconds) for a single track via track.getInfo. Returns 0 on failure. */
export async function getTrackDuration(artist: string, title: string): Promise<number> {
  try {
    const data = await apiCall({
      method: 'track.getInfo',
      artist,
      track: title,
      autocorrect: '1',
    });
    const dur = parseInt(data?.track?.duration ?? '0', 10);
    return Math.floor(dur / 1000); // Last.fm returns milliseconds
  } catch {
    return 0;
  }
}

export function parseContextToTags(context: string): string[] {
  const lower = context.toLowerCase();
  const tags: string[] = [];

  // Decades
  if (/\b80s\b|1980s?/.test(lower)) tags.push('80s');
  if (/\b70s\b|1970s?/.test(lower)) tags.push('70s');
  if (/\b90s\b|1990s?/.test(lower)) tags.push('90s');
  if (/\b60s\b|1960s?/.test(lower)) tags.push('60s');
  if (/\b2000s\b/.test(lower)) tags.push('2000s');
  if (/\b2010s\b/.test(lower)) tags.push('2010s');

  // Nationalities / regions
  if (/\bcanad(ian|a)\b/.test(lower)) tags.push('canadian');
  if (/\b(british|uk|england|english)\b/.test(lower)) tags.push('british');
  if (/\baustral(ian|ia)\b/.test(lower)) tags.push('australian');
  if (/\b(american|usa)\b/.test(lower)) tags.push('american');
  if (/\b(french|france)\b/.test(lower)) tags.push('french');
  if (/\b(irish|ireland)\b/.test(lower)) tags.push('irish');
  if (/\b(swedish|sweden)\b/.test(lower)) tags.push('swedish');

  // Genres
  const genreMap: Array<[RegExp, string]> = [
    [/\brock\b/, 'rock'],
    [/\bpop\b/, 'pop'],
    [/\bjazz\b/, 'jazz'],
    [/\bclassical\b/, 'classical'],
    [/\bhip.?hop\b|\brap\b/, 'hip-hop'],
    [/\bcountry\b/, 'country'],
    [/\belectronic\b|\bedm\b/, 'electronic'],
    [/\br&b\b|\brnb\b|\bsoul\b/, 'soul'],
    [/\bfolk\b/, 'folk'],
    [/\bindie\b/, 'indie'],
    [/\bmetal\b/, 'metal'],
    [/\bpunk\b/, 'punk'],
    [/\bblues\b/, 'blues'],
    [/\breggae\b/, 'reggae'],
    [/\balternative\b/, 'alternative'],
    [/\bambient\b/, 'ambient'],
    [/\bfunk\b/, 'funk'],
    [/\bnew wave\b/, 'new wave'],
    [/\bsoft rock\b/, 'soft rock'],
    [/\bhard rock\b/, 'hard rock'],
    [/\bprogressive\b/, 'progressive rock'],
    [/\bacoustic\b/, 'acoustic'],
  ];
  for (const [re, tag] of genreMap) {
    if (re.test(lower)) tags.push(tag);
  }

  // Moods and activities
  const moodMap: Array<[RegExp, string]> = [
    [/\bmellow\b/, 'mellow'],
    [/\bsoft\b/, 'soft'],
    [/\bchill\b/, 'chill'],
    [/\brelax(ing|ed)?\b/, 'relaxing'],
    [/\bsad\b|\bmelanchol/, 'sad'],
    [/\bhappy\b|\bupbeat\b/, 'happy'],
    [/\bromantic\b|\blove song/, 'romantic'],
    [/\bworkout\b|\brunning\b|\bgym\b|\bfitness\b/, 'workout'],
    [/\bstudy\b|\bfocus\b|\bconcentrat/, 'study'],
    [/\bparty\b/, 'party'],
    [/\bdance\b/, 'dance'],
    [/\bdrive\b|\broad trip\b/, 'road trip'],
    [/\bsleep\b|\bbedtime\b/, 'sleep'],
    [/\bmorning\b/, 'morning'],
    [/\benerg(etic|y)\b/, 'energetic'],
    [/\bnostalgic?\b/, 'nostalgic'],
    [/\bclassic\b/, 'classic'],
  ];
  for (const [re, tag] of moodMap) {
    if (re.test(lower)) tags.push(tag);
  }

  return [...new Set(tags)];
}

export async function generateLastFmPlaylist(
  suggestions: Array<{ title: string; artist: string }>,
  context: string
): Promise<Array<{ title: string; artist: string; duration: number; url: string }>> {
  const contextTags = parseContextToTags(context);
  console.log(`[Last.fm] Context tags parsed:`, contextTags);

  const candidateMap = new Map<string, LastFmTrackResult>();

  // Step 1: Get similar tracks for each suggestion
  await Promise.all(
    suggestions.map(async (suggestion, i) => {
      try {
        const data = await apiCall({
          method: 'track.getSimilar',
          artist: suggestion.artist,
          track: suggestion.title,
          limit: '100',
          autocorrect: '1',
        });

        const tracks: any[] = data?.similartracks?.track || [];
        console.log(`[Last.fm] Similar tracks for "${suggestion.title}" by ${suggestion.artist}: ${tracks.length}`);

        for (const track of tracks) {
          const artistName =
            typeof track.artist === 'string' ? track.artist : track.artist?.name || '';
          const key = `${artistName.toLowerCase()}|||${track.name.toLowerCase()}`;

          const matchScore = parseFloat(track.match) || 0;

          if (!candidateMap.has(key)) {
            candidateMap.set(key, {
              title: track.name,
              artist: artistName,
              duration: typeof track.duration === 'number' ? track.duration : 0,
              url: track.url || '',
              matchScore,
              tagScore: 0,
              decadeTagScore: 0,
              nationalityTagScore: 0,
            });
          } else {
            // Track appears for multiple suggestions — boost it
            const existing = candidateMap.get(key)!;
            existing.matchScore = Math.min(existing.matchScore + matchScore + 0.3, 2.0);
          }
        }
      } catch (err) {
        console.error(
          `[Last.fm] Failed to get similar tracks for "${suggestion.title}" by ${suggestion.artist}:`,
          err
        );
      }
    })
  );

  console.log(`[Last.fm] Total candidates after similar-track lookup: ${candidateMap.size}`);

  // Step 2a: Process decade tags — these are MANDATORY filters.
  // We fetch their top tracks, add them as candidates, then hard-filter the pool.
  const decadeTagsInContext = contextTags.filter((t) => DECADE_TAGS.includes(t));
  const nationalityTagsInContext = contextTags.filter((t) => NATIONALITY_TAGS.includes(t));
  const genreMoodTags = contextTags.filter(
    (t) => !DECADE_TAGS.includes(t) && !NATIONALITY_TAGS.includes(t)
  );

  const decadeKeySet = new Set<string>();
  const nationalityKeySet = new Set<string>();

  // Fetch decade tag tracks sequentially (order matters — we mutate the map)
  for (const decadeTag of decadeTagsInContext) {
    try {
      const data = await apiCall({ method: 'tag.getTopTracks', tag: decadeTag, limit: '200' });
      const tagTracks: any[] = data?.tracks?.track || [];

      for (const tagTrack of tagTracks) {
        const artistName =
          typeof tagTrack.artist === 'string' ? tagTrack.artist : tagTrack.artist?.name || '';
        const key = `${artistName.toLowerCase()}|||${tagTrack.name.toLowerCase()}`;
        decadeKeySet.add(key);

        if (candidateMap.has(key)) {
          candidateMap.get(key)!.tagScore += 0.5;
          candidateMap.get(key)!.decadeTagScore += 0.5;
        } else {
          // Add decade tracks as candidates even if not in the similar-tracks pool
          candidateMap.set(key, {
            title: tagTrack.name,
            artist: artistName,
            duration: typeof tagTrack.duration === 'number' ? tagTrack.duration : 0,
            url: tagTrack.url || '',
            matchScore: 0,
            tagScore: 0.5,
            decadeTagScore: 0.5,
            nationalityTagScore: 0,
          });
        }
      }

      console.log(`[Last.fm] Decade tag "${decadeTag}": ${tagTracks.length} tracks added/boosted`);
    } catch (err) {
      console.error(`[Last.fm] Failed to get top tracks for decade tag "${decadeTag}":`, err);
    }
  }

  // Hard-filter: if a decade was specified, remove any candidate NOT confirmed in that decade
  if (decadeTagsInContext.length > 0) {
    let removed = 0;
    for (const key of candidateMap.keys()) {
      if (!decadeKeySet.has(key)) {
        candidateMap.delete(key);
        removed++;
      }
    }
    console.log(`[Last.fm] Decade hard-filter removed ${removed} non-decade tracks. Remaining: ${candidateMap.size}`);
  }

  // Step 2b: Process nationality tags — also mandatory filters (same logic)
  for (const natTag of nationalityTagsInContext) {
    try {
      const data = await apiCall({ method: 'tag.getTopTracks', tag: natTag, limit: '200' });
      const tagTracks: any[] = data?.tracks?.track || [];

      for (const tagTrack of tagTracks) {
        const artistName =
          typeof tagTrack.artist === 'string' ? tagTrack.artist : tagTrack.artist?.name || '';
        const key = `${artistName.toLowerCase()}|||${tagTrack.name.toLowerCase()}`;
        nationalityKeySet.add(key);

        if (candidateMap.has(key)) {
          candidateMap.get(key)!.tagScore += 0.5;
          candidateMap.get(key)!.nationalityTagScore += 0.5;
        }
      }

      console.log(`[Last.fm] Nationality tag "${natTag}": ${tagTracks.length} tracks boosted`);
    } catch (err) {
      console.error(`[Last.fm] Failed to get top tracks for nationality tag "${natTag}":`, err);
    }
  }

  // Hard-filter: if nationality was specified and we have enough matches, keep only those
  if (nationalityTagsInContext.length > 0 && nationalityKeySet.size > 0) {
    const natMatched = Array.from(candidateMap.keys()).filter((k) => nationalityKeySet.has(k));
    if (natMatched.length >= 15) {
      let removed = 0;
      for (const key of candidateMap.keys()) {
        if (!nationalityKeySet.has(key)) {
          candidateMap.delete(key);
          removed++;
        }
      }
      console.log(`[Last.fm] Nationality hard-filter removed ${removed} tracks. Remaining: ${candidateMap.size}`);
    }
  }

  // Step 2c: Genre/mood tags — soft boosts only (no filtering)
  await Promise.all(
    genreMoodTags.slice(0, 6).map(async (tag) => {
      try {
        const data = await apiCall({ method: 'tag.getTopTracks', tag, limit: '200' });
        const tagTracks: any[] = data?.tracks?.track || [];

        for (const tagTrack of tagTracks) {
          const artistName =
            typeof tagTrack.artist === 'string' ? tagTrack.artist : tagTrack.artist?.name || '';
          const key = `${artistName.toLowerCase()}|||${tagTrack.name.toLowerCase()}`;

          if (candidateMap.has(key)) {
            candidateMap.get(key)!.tagScore += 0.2;
          }
        }

        console.log(`[Last.fm] Genre/mood tag "${tag}": ${tagTracks.length} tracks boosted`);
      } catch (err) {
        console.error(`[Last.fm] Failed to get top tracks for tag "${tag}":`, err);
      }
    })
  );

  // Step 3: Score and rank
  const candidates = Array.from(candidateMap.values());

  const scored = candidates
    .map((c) => ({ ...c, finalScore: c.matchScore + c.tagScore * 2.5 }))
    .sort((a, b) => b.finalScore - a.finalScore);

  console.log(`[Last.fm] Final pool: ${scored.length} tracks ready to spread`);

  // Pass a larger pool so spreadArtists has room to cap per-artist and still fill 20 slots
  const pool = scored.slice(0, 60).map((c) => ({
    title: c.title,
    artist: c.artist,
    duration: c.duration,
    url: c.url,
  }));

  return spreadArtists(pool, 20);
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Reorder tracks so the same artist never plays back-to-back and appears at most twice,
// unless the playlist is single-artist focused (>70% one artist).
export function spreadArtists<T extends { artist: string }>(tracks: T[], limit = 20): T[] {
  if (tracks.length === 0) return tracks;

  // Check if single-artist focused using the raw pool
  const rawCounts = new Map<string, number>();
  for (const t of tracks) {
    const a = t.artist.toLowerCase();
    rawCounts.set(a, (rawCounts.get(a) || 0) + 1);
  }
  const maxRaw = Math.max(...rawCounts.values());
  if (maxRaw / tracks.length > 0.7) return tracks.slice(0, limit);

  // Cap each artist at 2 tracks (keep highest-scored, which are earliest in the array)
  const artistSeen = new Map<string, number>();
  const capped: T[] = [];
  for (const t of tracks) {
    const a = t.artist.toLowerCase();
    const seen = artistSeen.get(a) || 0;
    if (seen < 2) {
      capped.push(t);
      artistSeen.set(a, seen + 1);
    }
    if (capped.length >= limit) break;
  }

  // Group into round 1 (first appearance) and round 2 (second appearance per artist)
  const round1: T[] = [];
  const round2: T[] = [];
  const artistRound = new Map<string, number>();
  for (const t of capped) {
    const a = t.artist.toLowerCase();
    const round = artistRound.get(a) || 0;
    if (round === 0) { round1.push(t); artistRound.set(a, 1); }
    else             { round2.push(t); }
  }

  // Shuffle each round independently for variety
  const s1 = shuffleArray(round1);
  const s2 = shuffleArray(round2);

  // Fix boundary: if last of s1 and first of s2 share an artist, swap s2[0] with another
  if (s1.length > 0 && s2.length > 0) {
    const lastArtist = s1[s1.length - 1].artist.toLowerCase();
    if (s2[0].artist.toLowerCase() === lastArtist) {
      const swapIdx = s2.findIndex(t => t.artist.toLowerCase() !== lastArtist);
      if (swapIdx > 0) [s2[0], s2[swapIdx]] = [s2[swapIdx], s2[0]];
    }
  }

  return [...s1, ...s2].slice(0, limit);
}
