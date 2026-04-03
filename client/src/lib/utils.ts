import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a playlist name from actual keywords in the context
export function generatePlaylistName(context: string): string {
  const lower = context.toLowerCase();

  const decadeMatch = context.match(/\b((?:19|20)?\d0s)\b/i);

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

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const parts: string[] = [];
  if (foundMood) parts.push(cap(foundMood));
  if (decadeMatch) parts.push(decadeMatch[1]);
  if (foundNation) parts.push(cap(foundNation));
  if (foundGenre) parts.push(cap(foundGenre));

  if (parts.length === 0) {
    // Fall back to capitalising the first 3 meaningful words
    const stopwords = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'and', 'or', 'for', 'to', 'with']);
    const words = context.trim().split(/\s+/).filter(w => !stopwords.has(w.toLowerCase()));
    return words.slice(0, 3).map(cap).join(' ') || 'Custom Mix';
  }

  return parts.join(' ');
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
