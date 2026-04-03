import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a 2–3 word playlist name from keywords in the context
export function generatePlaylistName(context: string): string {
  const lower = context.toLowerCase();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const decadeMatch = context.match(/\b((?:19|20)?\d0s)\b/i);
  const decade = decadeMatch ? decadeMatch[1] : null;

  const moods = ['mellow', 'upbeat', 'chill', 'energetic', 'dark', 'soft', 'smooth', 'funky',
    'groovy', 'dreamy', 'melancholy', 'nostalgic', 'epic', 'intimate', 'raw', 'intense',
    'relaxing', 'romantic', 'sad', 'happy', 'hype', 'lo-fi', 'lofi'];
  const foundMood = moods.find(m => lower.includes(m));

  const genres = ['rock', 'pop', 'jazz', 'blues', 'folk', 'country', 'hip-hop', 'hip hop',
    'soul', 'r&b', 'classical', 'electronic', 'metal', 'punk', 'indie', 'alternative',
    'reggae', 'latin', 'dance', 'disco', 'funk', 'emo', 'grunge', 'rap'];
  const foundGenre = genres.find(g => lower.includes(g));

  const nations = ['canadian', 'american', 'british', 'australian', 'french', 'latin',
    'african', 'japanese', 'korean', 'swedish', 'irish', 'scottish', 'italian'];
  const foundNation = nations.find(n => lower.includes(n));

  // Build candidate slots — ordered for natural-sounding titles
  // Mood leads when it's the main descriptor; otherwise decade/nation/genre give specificity
  const slots: string[] = [];

  // When we have a decade+nation+genre, those three are the most specific — use them
  if (decade && foundNation && foundGenre) {
    return `${decade} ${cap(foundNation)} ${cap(foundGenre)}`;
  }

  // Otherwise build naturally: mood → decade → nation → genre
  if (foundMood) slots.push(cap(foundMood));
  if (decade)    slots.push(decade);
  if (foundNation) slots.push(cap(foundNation));
  if (foundGenre)  slots.push(cap(foundGenre));

  // Take up to 3 parts
  const selected = slots.slice(0, 3);

  // Pad to at least 2 words when only one keyword matched
  if (selected.length === 1) {
    const moodNouns: Record<string, string> = {
      chill: 'Vibes', dreamy: 'Sounds', nostalgic: 'Memories',
      romantic: 'Evening', sad: 'Songs', happy: 'Tunes', relaxing: 'Escape',
    };
    const suffix = (foundMood && moodNouns[foundMood]) ?? 'Mix';
    selected.push(suffix);
  }

  if (selected.length > 0) return selected.join(' ');

  // Fallback: capitalise first 3 meaningful words of the context
  const stopwords = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'and', 'or', 'for',
    'to', 'with', 'some', 'songs', 'music', 'tracks', 'playlist']);
  const words = context.trim().split(/\s+/).filter(w => !stopwords.has(w.toLowerCase()));
  return words.slice(0, 3).map(cap).join(' ') || 'Custom Mix';
}

// Format duration from seconds to MM:SS
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Calculate total playlist duration
export function calculateTotalDuration(tracks: any[]): string {
  const totalSeconds = tracks.reduce((total, track) => total + track.duration, 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  } else {
    return `${minutes} min`;
  }
}
