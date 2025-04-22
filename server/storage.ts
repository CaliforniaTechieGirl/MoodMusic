import { 
  songs, type Song, type InsertSong,
  suggestions, type Suggestion, type InsertSuggestion,
  playlists, type Playlist, type InsertPlaylist,
  playlistSongs, type PlaylistSong, type InsertPlaylistSong,
  type PlaylistRequest, type PlaylistResponse
} from "@shared/schema";
import { mockSongs } from "./data/songs";
import { generatePlaylistName } from "../client/src/lib/utils";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Song methods
  getSongs(): Promise<Song[]>;
  getSongsByIds(ids: number[]): Promise<Song[]>;
  getSongsByGenre(genre: string): Promise<Song[]>;
  getSongsByMood(mood: string): Promise<Song[]>;
  getSongsByArtist(artist: string): Promise<Song[]>;
  
  // Playlist methods
  generatePlaylist(request: PlaylistRequest): Promise<PlaylistResponse>;
}

export class MemStorage implements IStorage {
  private songs: Map<number, Song>;
  private suggestions: Map<number, Suggestion>;
  private playlists: Map<number, Playlist>;
  private playlistSongs: Map<number, PlaylistSong>;
  
  currentSongId: number;
  currentSuggestionId: number;
  currentPlaylistId: number;
  currentPlaylistSongId: number;

  constructor() {
    this.songs = new Map();
    this.suggestions = new Map();
    this.playlists = new Map();
    this.playlistSongs = new Map();
    
    this.currentSongId = 1;
    this.currentSuggestionId = 1;
    this.currentPlaylistId = 1;
    this.currentPlaylistSongId = 1;
    
    // Populate with mock songs
    this.populateSongs();
  }

  private populateSongs() {
    mockSongs.forEach(song => {
      const id = this.currentSongId++;
      this.songs.set(id, { ...song, id });
    });
  }

  async getSongs(): Promise<Song[]> {
    return Array.from(this.songs.values());
  }

  async getSongsByIds(ids: number[]): Promise<Song[]> {
    return ids.map(id => this.songs.get(id)).filter(Boolean) as Song[];
  }

  async getSongsByGenre(genre: string): Promise<Song[]> {
    return Array.from(this.songs.values()).filter(
      song => song.genre && song.genre.includes(genre)
    );
  }

  async getSongsByMood(mood: string): Promise<Song[]> {
    return Array.from(this.songs.values()).filter(
      song => song.mood && song.mood.includes(mood)
    );
  }

  async getSongsByArtist(artist: string): Promise<Song[]> {
    return Array.from(this.songs.values()).filter(
      song => song.artist.toLowerCase().includes(artist.toLowerCase())
    );
  }

  private getRelevantSongsByContext(context: string): Song[] {
    const contextLower = context.toLowerCase();
    let relevantSongs: Song[] = [];
    
    // Map context keywords to moods or genres
    const contextMappings: { [key: string]: { genres?: string[], moods?: string[] } } = {
      'run': { genres: ['electronic', 'pop', 'rock'], moods: ['energetic', 'upbeat'] },
      'jog': { genres: ['electronic', 'pop', 'rock'], moods: ['energetic', 'upbeat'] },
      'workout': { genres: ['electronic', 'hip hop', 'rock'], moods: ['energetic', 'intense'] },
      'gym': { genres: ['electronic', 'hip hop', 'rock'], moods: ['energetic', 'intense'] },
      'study': { genres: ['classical', 'ambient', 'instrumental'], moods: ['calm', 'focused'] },
      'focus': { genres: ['classical', 'ambient', 'instrumental'], moods: ['calm', 'focused'] },
      'work': { genres: ['classical', 'ambient', 'jazz'], moods: ['calm', 'focused'] },
      'relax': { genres: ['ambient', 'acoustic', 'jazz'], moods: ['calm', 'relaxed'] },
      'chill': { genres: ['ambient', 'acoustic', 'r&b'], moods: ['calm', 'relaxed'] },
      'sleep': { genres: ['ambient', 'classical'], moods: ['calm', 'relaxed'] },
      'party': { genres: ['pop', 'hip hop', 'dance'], moods: ['energetic', 'upbeat'] },
      'dance': { genres: ['electronic', 'pop', 'hip hop'], moods: ['energetic', 'upbeat'] },
      'romantic': { genres: ['r&b', 'jazz', 'acoustic'], moods: ['relaxed', 'emotional'] },
      'dinner': { genres: ['jazz', 'acoustic', 'classical'], moods: ['relaxed', 'sophisticated'] },
      'drive': { genres: ['rock', 'pop', 'country'], moods: ['energetic', 'relaxed'] },
      'car': { genres: ['rock', 'pop', 'country'], moods: ['energetic', 'relaxed'] },
      'sad': { genres: ['acoustic', 'indie', 'alternative'], moods: ['emotional', 'sad'] },
      'happy': { genres: ['pop', 'funk', 'dance'], moods: ['upbeat', 'energetic'] }
    };

    // Find matching contexts
    let matchedGenres: Set<string> = new Set();
    let matchedMoods: Set<string> = new Set();

    Object.keys(contextMappings).forEach(keyword => {
      if (contextLower.includes(keyword)) {
        const mapping = contextMappings[keyword];
        if (mapping.genres) {
          mapping.genres.forEach(genre => matchedGenres.add(genre));
        }
        if (mapping.moods) {
          mapping.moods.forEach(mood => matchedMoods.add(mood));
        }
      }
    });

    // If we found matches, get songs that match the genres or moods
    if (matchedGenres.size > 0 || matchedMoods.size > 0) {
      const genreArray = Array.from(matchedGenres);
      const moodArray = Array.from(matchedMoods);
      
      relevantSongs = Array.from(this.songs.values()).filter(song => {
        const hasMatchingGenre = song.genre && genreArray.some(genre => 
          song.genre!.includes(genre)
        );
        const hasMatchingMood = song.mood && moodArray.some(mood => 
          song.mood!.includes(mood)
        );
        return hasMatchingGenre || hasMatchingMood;
      });
    }

    // If we didn't find enough songs, just return a random selection
    if (relevantSongs.length < 20) {
      const allSongs = Array.from(this.songs.values());
      // Shuffle all songs
      const shuffled = [...allSongs].sort(() => 0.5 - Math.random());
      // Add enough unique songs to reach 20
      while (relevantSongs.length < 20 && shuffled.length > 0) {
        const nextSong = shuffled.pop();
        if (nextSong && !relevantSongs.some(s => s.id === nextSong.id)) {
          relevantSongs.push(nextSong);
        }
      }
    }
    
    return relevantSongs;
  }

  private getSimilarSongs(suggestionArtists: string[], existingSongIds: Set<number>): Song[] {
    // Get songs by the same artists
    let similarSongs = Array.from(this.songs.values()).filter(song => 
      !existingSongIds.has(song.id) && 
      suggestionArtists.some(artist => 
        song.artist.toLowerCase().includes(artist.toLowerCase())
      )
    );
    
    // Add some random songs if we don't have enough
    if (similarSongs.length < 5) {
      const allSongs = Array.from(this.songs.values());
      const shuffled = [...allSongs].sort(() => 0.5 - Math.random());
      
      while (similarSongs.length < 5 && shuffled.length > 0) {
        const nextSong = shuffled.pop();
        if (nextSong && !existingSongIds.has(nextSong.id) && 
            !similarSongs.some(s => s.id === nextSong.id)) {
          similarSongs.push(nextSong);
        }
      }
    }
    
    return similarSongs;
  }

  private getDurationScore(a: Song, b: Song): number {
    // Calculate how close two songs are in duration (0-1 scale, 1 being closest)
    const diff = Math.abs(a.duration - b.duration);
    return 1 - Math.min(diff / 120, 1); // 2 minute max difference for 0 score
  }

  private arrangeInMusicalOrder(songs: Song[]): Song[] {
    if (songs.length <= 1) return songs;
    
    // Start with a random song
    const orderedSongs: Song[] = [songs[0]];
    const remainingSongs = songs.slice(1);
    
    // For each position, find the best next song
    while (remainingSongs.length > 0) {
      const currentSong = orderedSongs[orderedSongs.length - 1];
      
      // Score remaining songs by how well they follow the current song
      const songScores = remainingSongs.map((song, index) => {
        const durationScore = this.getDurationScore(currentSong, song);
        // For a real implementation, could consider genre, tempo, key, etc.
        return { index, score: durationScore };
      });
      
      // Pick the best scoring song
      songScores.sort((a, b) => b.score - a.score);
      const bestNextSongIndex = songScores[0].index;
      
      // Add it to the ordered list and remove from remaining
      orderedSongs.push(remainingSongs[bestNextSongIndex]);
      remainingSongs.splice(bestNextSongIndex, 1);
    }
    
    return orderedSongs;
  }

  async generatePlaylist(request: PlaylistRequest): Promise<PlaylistResponse> {
    const { context, suggestions } = request;
    
    // 1. Get songs from user suggestions
    const suggestedSongs: Song[] = [];
    for (const suggestion of suggestions) {
      const { title, artist } = suggestion;
      
      // Try to find an exact match
      let matchedSong = Array.from(this.songs.values()).find(song => 
        song.title.toLowerCase() === title.toLowerCase() && 
        song.artist.toLowerCase() === artist.toLowerCase()
      );
      
      // If no exact match, try to find a similar song by the same artist
      if (!matchedSong) {
        matchedSong = Array.from(this.songs.values()).find(song => 
          song.artist.toLowerCase().includes(artist.toLowerCase())
        );
      }
      
      // If still no match, create a new song entry
      if (!matchedSong) {
        const id = this.currentSongId++;
        const duration = Math.floor(180 + Math.random() * 120); // Random duration between 3-5 mins
        matchedSong = { 
          id, 
          title, 
          artist, 
          duration,
          genre: [],
          mood: []
        };
        this.songs.set(id, matchedSong);
      }
      
      suggestedSongs.push(matchedSong);
    }
    
    // 2. Get songs based on context
    const contextSongs = this.getRelevantSongsByContext(context);
    
    // 3. Create a set of existing song IDs to avoid duplicates
    const existingSongIds = new Set(suggestedSongs.map(song => song.id));
    
    // 4. Get additional similar songs based on the suggested artists
    const suggestionArtists = suggestions.map(s => s.artist);
    const similarSongs = this.getSimilarSongs(suggestionArtists, existingSongIds);
    
    // 5. Fill remaining slots with context songs, avoiding duplicates
    const playlistSongs: Song[] = [...suggestedSongs];
    
    // Add similar songs
    for (const song of similarSongs) {
      if (playlistSongs.length >= 20) break;
      if (!existingSongIds.has(song.id)) {
        playlistSongs.push(song);
        existingSongIds.add(song.id);
      }
    }
    
    // Add context songs
    for (const song of contextSongs) {
      if (playlistSongs.length >= 20) break;
      if (!existingSongIds.has(song.id)) {
        playlistSongs.push(song);
        existingSongIds.add(song.id);
      }
    }
    
    // 6. Arrange songs in a pleasing musical order
    const orderedSongs = this.arrangeInMusicalOrder(playlistSongs);
    
    // 7. Create response object
    const playlistName = generatePlaylistName(context);
    
    return {
      name: playlistName,
      tracks: orderedSongs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration
      }))
    };
  }
}

export const storage = new MemStorage();
