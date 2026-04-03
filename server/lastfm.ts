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

  // Step 2: Score candidates against context tags using tag.getTopTracks
  if (contextTags.length > 0) {
    const specificTags = contextTags.filter((t) =>
      ['80s', '70s', '90s', '60s', '2000s', '2010s',
       'canadian', 'british', 'australian', 'american', 'french', 'irish', 'swedish'].includes(t)
    );
    const genericTags = contextTags.filter((t) => !specificTags.includes(t));

    // Fetch specific tags first (nationality/decade), then genre/mood — cap at 8 total API calls
    const tagsToFetch = [...specificTags, ...genericTags].slice(0, 8);

    await Promise.all(
      tagsToFetch.map(async (tag) => {
        try {
          const data = await apiCall({
            method: 'tag.getTopTracks',
            tag,
            limit: '200',
          });

          const tagTracks: any[] = data?.tracks?.track || [];
          const isSpecific = specificTags.includes(tag);
          const boost = isSpecific ? 0.5 : 0.2;

          for (const tagTrack of tagTracks) {
            const artistName =
              typeof tagTrack.artist === 'string' ? tagTrack.artist : tagTrack.artist?.name || '';
            const key = `${artistName.toLowerCase()}|||${tagTrack.name.toLowerCase()}`;

            if (candidateMap.has(key)) {
              candidateMap.get(key)!.tagScore += boost;
            }
          }

          console.log(
            `[Last.fm] Tag "${tag}" returned ${tagTracks.length} tracks (boost: ${boost})`
          );
        } catch (err) {
          console.error(`[Last.fm] Failed to get top tracks for tag "${tag}":`, err);
        }
      })
    );
  }

  // Step 3: Score and rank
  const candidates = Array.from(candidateMap.values());

  // Tag score is weighted more heavily — it ensures context relevance
  const scored = candidates
    .map((c) => ({ ...c, finalScore: c.matchScore + c.tagScore * 2.5 }))
    .sort((a, b) => b.finalScore - a.finalScore);

  // If context tags exist and we have enough matched tracks, prefer those
  const tagMatched = scored.filter((c) => c.tagScore > 0);
  const result = contextTags.length > 0 && tagMatched.length >= 12 ? tagMatched : scored;

  console.log(
    `[Last.fm] Final pool: ${result.length} tracks (${tagMatched.length} matched context tags)`
  );

  const top20 = result.slice(0, 20).map((c) => ({
    title: c.title,
    artist: c.artist,
    duration: c.duration,
    url: c.url,
  }));

  return spreadArtists(top20);
}

// Reorder tracks so the same artist never plays back-to-back,
// unless the playlist is single-artist focused (>70% one artist).
function spreadArtists<T extends { artist: string }>(tracks: T[]): T[] {
  if (tracks.length === 0) return tracks;

  // Count artist occurrences
  const counts = new Map<string, number>();
  for (const t of tracks) {
    const a = t.artist.toLowerCase();
    counts.set(a, (counts.get(a) || 0) + 1);
  }

  // If one artist dominates (single-artist playlist), leave order as-is
  const maxCount = Math.max(...counts.values());
  if (maxCount / tracks.length > 0.7) return tracks;

  // Greedy spread: at each position pick the highest-priority (earliest in array)
  // track whose artist differs from the previous one added.
  const remaining = [...tracks];
  const out: T[] = [];

  while (remaining.length > 0) {
    const lastArtist = out.length > 0 ? out[out.length - 1].artist.toLowerCase() : null;
    const idx = remaining.findIndex(t => t.artist.toLowerCase() !== lastArtist);

    if (idx === -1) {
      // Only same-artist tracks left — just append them
      out.push(...remaining.splice(0));
    } else {
      out.push(...remaining.splice(idx, 1));
    }
  }

  return out;
}
