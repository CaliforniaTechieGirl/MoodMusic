import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a playlist name based on context
export function generatePlaylistName(context: string): string {
  const contextLower = context.toLowerCase();
  
  if (contextLower.includes('run') || contextLower.includes('jog')) {
    return 'Running Energizers';
  } else if (contextLower.includes('work') || contextLower.includes('focus')) {
    return 'Focus Flow';
  } else if (contextLower.includes('relax') || contextLower.includes('chill')) {
    return 'Chill Vibes';
  } else if (contextLower.includes('party') || contextLower.includes('danc')) {
    return 'Party Anthems';
  } else if (contextLower.includes('romantic') || contextLower.includes('dinner')) {
    return 'Romantic Evening';
  } else if (contextLower.includes('sleep') || contextLower.includes('bed')) {
    return 'Slumber Sounds';
  } else if (contextLower.includes('gym') || contextLower.includes('workout')) {
    return 'Workout Intensity';
  } else if (contextLower.includes('study')) {
    return 'Study Session';
  } else if (contextLower.includes('drive') || contextLower.includes('car')) {
    return 'Road Trip Mix';
  } else if (contextLower.includes('sad') || contextLower.includes('depress')) {
    return 'Soul Soothers';
  } else {
    return 'Custom Mix';
  }
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
