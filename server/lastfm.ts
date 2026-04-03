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

// Extra Last.fm tags that broaden coverage for each decade
const DECADE_ALIASES: Record<string, string[]> = {
  '60s': ['1960s', 'sixties'],
  '70s': ['1970s', 'seventies'],
  '80s': ['1980s', 'eighties'],
  '90s': ['1990s', 'nineties'],
  '2000s': ['00s'],
  '2010s': ['10s'],
};

// Genre-specific nationality tags that have much better era coverage than the bare country tag
const NATIONALITY_GENRE_COMBOS: Record<string, string[]> = {
  'canadian':   ['cancon', 'canadian rock', 'canadian pop', 'canadian indie', 'canadian folk'],
  'british':    ['britpop', 'british rock', 'british pop', 'british invasion'],
  'australian': ['australian rock', 'aussie rock', 'australian pop'],
  'american':   ['american rock', 'americana', 'american pop'],
  'french':     ['french pop', 'chanson', 'french rock'],
  'irish':      ['irish rock', 'irish folk', 'celtic'],
  'swedish':    ['swedish pop', 'swedish rock'],
};

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

/** Search Last.fm for a track and return the top result (or null). */
async function searchTrackCorrection(
  title: string,
  artist: string
): Promise<{ title: string; artist: string } | null> {
  try {
    const data = await apiCall({
      method: 'track.search',
      track: title,
      artist: artist,
      limit: '3',
    });
    const results: any[] = data?.results?.trackmatches?.track || [];
    if (results.length === 0) return null;
    const top = results[0];
    const foundTitle = top.name as string;
    const foundArtist = top.artist as string;
    // Only suggest if the result is meaningfully different from the input
    const sameTitle = foundTitle.toLowerCase() === title.toLowerCase();
    const sameArtist = foundArtist.toLowerCase() === artist.toLowerCase();
    if (sameTitle && sameArtist) return null;
    return { title: foundTitle, artist: foundArtist };
  } catch {
    return null;
  }
}

export async function generateLastFmPlaylist(
  suggestions: Array<{ title: string; artist: string }>,
  context: string
): Promise<{
  tracks: Array<{ title: string; artist: string; duration: number; url: string }>;
  warnings: Array<{ inputTitle: string; inputArtist: string; message: string; suggestion?: { title: string; artist: string } }>;
}> {
  const contextTags = parseContextToTags(context);
  console.log(`[Last.fm] Context tags parsed:`, contextTags);

  const candidateMap = new Map<string, LastFmTrackResult>();
  const warnings: Array<{ inputTitle: string; inputArtist: string; message: string; suggestion?: { title: string; artist: string } }> = [];

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

        if (tracks.length === 0) {
          // Search for a close match to help the user correct their input
          const correction = await searchTrackCorrection(suggestion.title, suggestion.artist);
          const warning: typeof warnings[0] = {
            inputTitle: suggestion.title,
            inputArtist: suggestion.artist,
            message: `No similar songs found for "${suggestion.title}" by ${suggestion.artist}.`,
            suggestion: correction ?? undefined,
          };
          if (correction) {
            warning.message += ` Did you mean "${correction.title}" by ${correction.artist}?`;
            console.log(`[Last.fm] Suggested correction: "${correction.title}" by ${correction.artist}`);
          }
          warnings.push(warning);
          return;
        }

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

  // Step 2: Tag-filter the similar-tracks pool.
  //
  // Rather than fetching tag.getTopTracks lists and intersecting with the similar pool
  // (which fails for niche combos like "1960s Canadian" because the overlap is ~0),
  // we go the other direction: for each ARTIST in our similar pool, fetch their actual
  // Last.fm tags and score/filter against the user's constraints directly.
  //
  // This means "Neil Young" in the similar pool gets checked: does Last.fm tag Neil Young
  // as "canadian"? Yes → nationality constraint passes. Does Last.fm tag him as "70s"?
  // Yes → decade constraint passes. The Beach Boys: "american" → nationality fails.
  const decadeTagsInContext = contextTags.filter((t) => DECADE_TAGS.includes(t));
  const nationalityTagsInContext = contextTags.filter((t) => NATIONALITY_TAGS.includes(t));
  const genreMoodTags = contextTags.filter(
    (t) => !DECADE_TAGS.includes(t) && !NATIONALITY_TAGS.includes(t)
  );

  // Build accepted-tag sets (including all aliases and genre combos)
  const decadeAccepted = new Set<string>(
    decadeTagsInContext.flatMap((d) => [d, ...(DECADE_ALIASES[d] || [])])
  );
  const natAccepted = new Set<string>(
    nationalityTagsInContext.flatMap((n) => [n, ...(NATIONALITY_GENRE_COMBOS[n] || [])])
  );

  // Fetch artist.getTopTags for every unique artist in the similar pool (in parallel)
  const uniqueArtists = [...new Set(Array.from(candidateMap.values()).map((t) => t.artist))];
  const artistTagMap = new Map<string, Set<string>>();

  await Promise.all(
    uniqueArtists.map(async (artist) => {
      try {
        const data = await apiCall({ method: 'artist.getTopTags', artist, autocorrect: '1' });
        const tags: string[] = (data?.toptags?.tag || [])
          .slice(0, 20)
          .map((t: any) => (t.name as string).toLowerCase());
        artistTagMap.set(artist.toLowerCase(), new Set(tags));
      } catch {
        artistTagMap.set(artist.toLowerCase(), new Set());
      }
    })
  );

  console.log(`[Last.fm] Fetched artist tags for ${artistTagMap.size} unique artists`);

  // Score every track against the context using its artist's actual tags
  for (const [, track] of candidateMap.entries()) {
    const artistTags = artistTagMap.get(track.artist.toLowerCase()) ?? new Set<string>();

    const matchesDecade = decadeAccepted.size === 0 || [...decadeAccepted].some((t) => artistTags.has(t));
    const matchesNat    = natAccepted.size === 0    || [...natAccepted].some((t) => artistTags.has(t));
    const genreScore    = genreMoodTags.filter((t) => artistTags.has(t)).length * 0.4;

    // Nationality weighted 2× decade — being from the right country is the stronger constraint
    if (matchesDecade) { track.tagScore += 1.0; track.decadeTagScore += 1.0; }
    if (matchesNat)    { track.tagScore += 2.0; track.nationalityTagScore += 2.0; }
    track.tagScore += genreScore;
  }

  // Apply constraints as hard filters with a priority-ordered fallback:
  //   1. Both pass (strict AND) → hard filter if ≥ 10 tracks
  //   2. Nationality passes → hard filter to nationality-only (never let non-nat tracks in)
  //   3. Decade passes (no nationality constraint) → hard filter to decade
  //   4. Fully relaxed → soft scoring only
  //
  // Crucially: we NEVER fall back to an OR filter that mixes decade-only and nationality-only.
  // If someone asks for "Canadian" music, The Who should not appear just because they're "60s".
  const hasDecade = decadeTagsInContext.length > 0;
  const hasNat    = nationalityTagsInContext.length > 0;

  if (hasDecade || hasNat) {
    const artistPasses = (track: LastFmTrackResult, requireDecade: boolean, requireNat: boolean) => {
      const artistTags = artistTagMap.get(track.artist.toLowerCase()) ?? new Set<string>();
      const decadeOk = !requireDecade || [...decadeAccepted].some((t) => artistTags.has(t));
      const natOk    = !requireNat    || [...natAccepted].some((t) => artistTags.has(t));
      return decadeOk && natOk;
    };

    const countBoth = Array.from(candidateMap.values()).filter((t) => artistPasses(t, hasDecade, hasNat)).length;
    const countNat  = hasNat ? Array.from(candidateMap.values()).filter((t) => artistPasses(t, false, true)).length : 0;
    const countDec  = hasDecade ? Array.from(candidateMap.values()).filter((t) => artistPasses(t, true, false)).length : 0;

    console.log(`[Last.fm] Tag filter counts — both: ${countBoth}, nat-only: ${countNat}, decade-only: ${countDec}`);

    if (countBoth >= 10) {
      // Ideal case: enough tracks pass all constraints
      for (const [key, track] of candidateMap.entries()) {
        if (!artistPasses(track, hasDecade, hasNat)) candidateMap.delete(key);
      }
      console.log(`[Last.fm] Hard-filtered (both constraints): ${candidateMap.size} tracks`);

    } else if (hasNat && countNat >= 8) {
      // Nationality is the primary constraint — keep all nationality-passing tracks,
      // let decade scoring rank them. Never mix in non-Canadian artists.
      for (const [key, track] of candidateMap.entries()) {
        if (!artistPasses(track, false, true)) candidateMap.delete(key);
      }
      console.log(`[Last.fm] Hard-filtered (nationality only): ${candidateMap.size} tracks (decade is soft boost)`);

    } else if (!hasNat && hasDecade && countDec >= 8) {
      // Decade-only constraint with enough tracks
      for (const [key, track] of candidateMap.entries()) {
        if (!artistPasses(track, true, false)) candidateMap.delete(key);
      }
      console.log(`[Last.fm] Hard-filtered (decade only): ${candidateMap.size} tracks`);

    } else {
      // Too few tracks pass any single constraint — keep all, rely on scoring
      console.log(`[Last.fm] Constraints relaxed (too few passing tracks) — using soft scoring only`);
    }
  }

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

  return { tracks: spreadArtists(pool, 20), warnings };
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
