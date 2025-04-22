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
    
    // Enhanced context mappings with more specific genres and moods
    const contextMappings: { [key: string]: { genres?: string[], moods?: string[], weight: number } } = {
      // Activity-based contexts
      'run': { genres: ['electronic', 'pop', 'rock'], moods: ['energetic', 'upbeat'], weight: 10 },
      'jog': { genres: ['electronic', 'pop', 'rock'], moods: ['energetic', 'upbeat'], weight: 10 },
      'workout': { genres: ['electronic', 'hip hop', 'rock'], moods: ['energetic', 'intense'], weight: 10 },
      'gym': { genres: ['electronic', 'hip hop', 'rock'], moods: ['energetic', 'intense'], weight: 10 },
      'fitness': { genres: ['electronic', 'hip hop', 'rock'], moods: ['energetic', 'intense'], weight: 10 },
      'exercise': { genres: ['electronic', 'pop', 'rock'], moods: ['energetic', 'upbeat'], weight: 10 },
      
      // Focus contexts
      'study': { genres: ['classical', 'ambient', 'instrumental', 'piano'], moods: ['calm', 'focused'], weight: 10 },
      'studying': { genres: ['classical', 'ambient', 'instrumental', 'piano'], moods: ['calm', 'focused'], weight: 10 },
      'session': { genres: ['classical', 'ambient', 'instrumental'], moods: ['calm', 'focused'], weight: 8 },
      'focus': { genres: ['classical', 'ambient', 'instrumental', 'piano'], moods: ['calm', 'focused'], weight: 10 },
      'work': { genres: ['classical', 'ambient', 'jazz'], moods: ['calm', 'focused'], weight: 10 },
      'concentrate': { genres: ['classical', 'ambient', 'instrumental'], moods: ['calm', 'focused'], weight: 10 },
      'concentration': { genres: ['classical', 'ambient', 'instrumental'], moods: ['calm', 'focused'], weight: 10 },  
      'reading': { genres: ['classical', 'ambient', 'instrumental'], moods: ['calm', 'focused'], weight: 8 },
      'homework': { genres: ['classical', 'ambient', 'instrumental'], moods: ['calm', 'focused'], weight: 9 },
      
      // Relaxation contexts
      'relax': { genres: ['ambient', 'acoustic', 'jazz'], moods: ['calm', 'relaxed'], weight: 10 },
      'chill': { genres: ['ambient', 'acoustic', 'r&b'], moods: ['calm', 'relaxed'], weight: 10 },
      'unwind': { genres: ['ambient', 'acoustic', 'jazz'], moods: ['calm', 'relaxed'], weight: 8 },
      'sleep': { genres: ['ambient', 'classical'], moods: ['calm', 'relaxed'], weight: 10 },
      'rest': { genres: ['ambient', 'classical'], moods: ['calm', 'relaxed'], weight: 8 },
      'meditate': { genres: ['ambient'], moods: ['calm'], weight: 10 },
      
      // Social contexts
      'party': { genres: ['pop', 'hip hop', 'dance'], moods: ['energetic', 'upbeat'], weight: 10 },
      'dance': { genres: ['electronic', 'pop', 'hip hop'], moods: ['energetic', 'upbeat'], weight: 10 },
      'celebration': { genres: ['pop', 'dance'], moods: ['upbeat', 'happy'], weight: 8 },
      'gathering': { genres: ['pop', 'rock'], moods: ['upbeat'], weight: 7 },
      'friends': { genres: ['pop', 'hip hop', 'rock'], moods: ['upbeat'], weight: 8 },
      
      // Romantic contexts
      'romantic': { genres: ['r&b', 'jazz', 'acoustic'], moods: ['relaxed', 'emotional', 'romantic'], weight: 10 },
      'date': { genres: ['r&b', 'jazz', 'acoustic'], moods: ['relaxed', 'romantic'], weight: 9 },
      'dinner': { genres: ['jazz', 'acoustic', 'classical'], moods: ['relaxed', 'sophisticated'], weight: 10 },
      'love': { genres: ['r&b', 'pop', 'acoustic'], moods: ['emotional', 'romantic'], weight: 10 },
      'evening': { genres: ['jazz', 'r&b', 'acoustic'], moods: ['relaxed'], weight: 7 },
      
      // Travel contexts
      'drive': { genres: ['rock', 'pop', 'country'], moods: ['energetic', 'relaxed'], weight: 10 },
      'car': { genres: ['rock', 'pop', 'country'], moods: ['energetic', 'relaxed'], weight: 10 },
      'road': { genres: ['rock', 'country', 'alternative'], moods: ['energetic'], weight: 9 },
      'trip': { genres: ['pop', 'rock', 'alternative'], moods: ['upbeat'], weight: 8 },
      'travel': { genres: ['pop', 'rock'], moods: ['upbeat', 'energetic'], weight: 8 },
      
      // Emotional contexts
      'sad': { genres: ['acoustic', 'indie', 'alternative'], moods: ['emotional', 'sad'], weight: 10 },
      'happy': { genres: ['pop', 'funk', 'dance'], moods: ['upbeat', 'happy'], weight: 10 },
      'angry': { genres: ['rock', 'metal'], moods: ['intense'], weight: 10 },
      'emotional': { genres: ['indie', 'acoustic', 'alternative'], moods: ['emotional'], weight: 10 },
      'reflective': { genres: ['acoustic', 'indie', 'classical'], moods: ['calm', 'emotional'], weight: 9 },
      
      // Time-based contexts
      'morning': { genres: ['pop', 'acoustic'], moods: ['upbeat', 'energetic'], weight: 7 },
      'afternoon': { genres: ['pop', 'rock'], moods: ['relaxed', 'upbeat'], weight: 6 },
      'night': { genres: ['electronic', 'r&b'], moods: ['energetic', 'relaxed'], weight: 7 },
      'weekend': { genres: ['pop', 'dance'], moods: ['upbeat'], weight: 6 }
    };

    // Store context matches with their weights
    let contextMatches: { genre: string, mood: string, weight: number }[] = [];

    // Find matching contexts with weighted importance
    Object.keys(contextMappings).forEach(keyword => {
      if (contextLower.includes(keyword)) {
        const mapping = contextMappings[keyword];
        const weight = mapping.weight;
        
        // For each matching context keyword, add its genres and moods with weight
        if (mapping.genres) {
          mapping.genres.forEach(genre => {
            mapping.moods?.forEach(mood => {
              contextMatches.push({ genre, mood, weight });
            });
          });
        }
      }
    });
    
    // Special handling for common phrases that might not directly match single keywords
    if (contextLower.includes("study session") || 
        (contextLower.includes("study") && contextLower.includes("session"))) {
      // Add extra weight for study sessions with classical/instrumental music
      const studyGenres = ['classical', 'instrumental', 'piano', 'ambient'];
      const studyMoods = ['calm', 'focused', 'background'];
      
      studyGenres.forEach(genre => {
        studyMoods.forEach(mood => {
          // Add with high weight (12) to prioritize these matches
          contextMatches.push({ genre, mood, weight: 12 });
        });
      });
    }
    
    // Handle other multi-word contexts that need special emphasis
    if (contextLower.includes("romantic dinner") || 
        (contextLower.includes("romantic") && contextLower.includes("dinner"))) {
      const genres = ['jazz', 'classical', 'acoustic'];
      const moods = ['romantic', 'relaxed', 'sophisticated'];
      
      genres.forEach(genre => {
        moods.forEach(mood => {
          contextMatches.push({ genre, mood, weight: 12 });
        });
      });
    }

    // If we found matches, get songs that match the genres or moods
    if (contextMatches.length > 0) {
      // Group by genre-mood combinations and sum weights
      const weightedCombinations = new Map<string, number>();
      contextMatches.forEach(match => {
        const key = `${match.genre}-${match.mood}`;
        const currentWeight = weightedCombinations.get(key) || 0;
        weightedCombinations.set(key, currentWeight + match.weight);
      });
      
      // Convert to array and sort by weight (descending)
      const sortedCombinations = Array.from(weightedCombinations.entries())
        .map(([key, weight]) => {
          const [genre, mood] = key.split('-');
          return { genre, mood, weight };
        })
        .sort((a, b) => b.weight - a.weight);
      
      // Get songs that match top combinations
      const songScores = new Map<number, number>();
      
      // Score each song based on how well it matches the context
      Array.from(this.songs.values()).forEach(song => {
        let score = 0;
        
        sortedCombinations.forEach(combination => {
          const genreMatch = song.genre?.includes(combination.genre) || false;
          const moodMatch = song.mood?.includes(combination.mood) || false;
          
          // Higher score for exact matches
          if (genreMatch && moodMatch) {
            score += combination.weight * 2;
          } 
          // Lower score for partial matches
          else if (genreMatch || moodMatch) {
            score += combination.weight;
          }
        });
        
        // Add artist-specific bonuses for certain contexts
        if (contextLower.includes("study") || contextLower.includes("focus") || 
            contextLower.includes("concentration")) {
          // Classical and instrumental artists good for studying
          const studyArtists = ['beethoven', 'debussy', 'mozart', 'bach', 'yiruma', 'einaudi'];
          if (studyArtists.some(a => song.artist.toLowerCase().includes(a))) {
            score += 20; // High bonus to prioritize these artists
          }
        }
        
        if (contextLower.includes("workout") || contextLower.includes("run") || contextLower.includes("gym")) {
          // High energy artists good for workouts
          const workoutArtists = ['ac/dc', 'eminem', 'daft punk', 'survivor', 
                                 'black eyed peas', 'swedish house mafia'];
          if (workoutArtists.some(a => song.artist.toLowerCase().includes(a))) {
            score += 20;
          }
        }
        
        if (contextLower.includes("romantic") || contextLower.includes("dinner") || 
           contextLower.includes("date")) {
          // Artists good for romantic settings
          const romanticArtists = ['frank sinatra', 'john legend', 'adele', 'nina simone', 
                                  'ed sheeran', 'ray charles'];
          if (romanticArtists.some(a => song.artist.toLowerCase().includes(a))) {
            score += 20;
          }
        }
        
        if (score > 0) {
          songScores.set(song.id, score);
        }
      });
      
      // Convert to array and sort by score (descending)
      const scoredSongs = Array.from(songScores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => this.songs.get(id)!)
        .filter(Boolean);
      
      // Take the top scoring songs
      relevantSongs = scoredSongs.slice(0, 30); // Get more than needed for variety
    }

    // Ensure we have enough songs
    if (relevantSongs.length < 20) {
      console.log(`Not enough context-relevant songs found (${relevantSongs.length}), adding random songs`);
      
      // Get songs not already in the list
      const existingIds = new Set(relevantSongs.map(song => song.id));
      const remainingSongs = Array.from(this.songs.values())
        .filter(song => !existingIds.has(song.id));
      
      // Shuffle remaining songs
      const shuffled = [...remainingSongs].sort(() => 0.5 - Math.random());
      
      // Add enough unique songs to reach at least 20
      while (relevantSongs.length < 20 && shuffled.length > 0) {
        const nextSong = shuffled.pop();
        if (nextSong) {
          relevantSongs.push(nextSong);
        }
      }
    }
    
    // Shuffle the songs for variety
    return relevantSongs.sort(() => 0.5 - Math.random());
  }

  private getSimilarSongs(suggestionArtists: string[], existingSongIds: Set<number>): Song[] {
    // First, get songs by the exact same artists
    let artistSongs = Array.from(this.songs.values()).filter(song => 
      !existingSongIds.has(song.id) && 
      suggestionArtists.some(artist => 
        song.artist.toLowerCase().includes(artist.toLowerCase())
      )
    );
    
    // Score all songs by genre/mood similarity to originals
    // This helps find songs that "sound like" the suggested artists' styles
    
    // 1. First, collect genres and moods from all songs by the suggested artists
    const artistGenres = new Set<string>();
    const artistMoods = new Set<string>();
    
    Array.from(this.songs.values()).forEach(song => {
      if (suggestionArtists.some(artist => 
          song.artist.toLowerCase().includes(artist.toLowerCase()))) {
        song.genre?.forEach(g => artistGenres.add(g));
        song.mood?.forEach(m => artistMoods.add(m));
      }
    });
    
    // Convert sets to arrays
    const targetGenres = Array.from(artistGenres);
    const targetMoods = Array.from(artistMoods);
    
    // Score all songs based on genre/mood overlap with suggested artists
    if (targetGenres.length > 0 || targetMoods.length > 0) {
      const scoredSongs = Array.from(this.songs.values())
        .filter(song => !existingSongIds.has(song.id) && !artistSongs.some(s => s.id === song.id))
        .map(song => {
          // Calculate genre overlap
          const genreOverlap = song.genre ? 
            song.genre.filter(g => targetGenres.includes(g)).length / 
            Math.max(targetGenres.length, 1) : 0;
            
          // Calculate mood overlap
          const moodOverlap = song.mood ? 
            song.mood.filter(m => targetMoods.includes(m)).length / 
            Math.max(targetMoods.length, 1) : 0;
            
          // Combine scores (double weight for genre)
          const score = (genreOverlap * 2 + moodOverlap) / 3;
          
          return { song, score };
        })
        .filter(item => item.score > 0)  // Only include songs with some similarity
        .sort((a, b) => b.score - a.score);  // Sort by score descending
      
      // Add the top similar songs by genre/mood
      const genreSimilarSongs = scoredSongs.slice(0, 10).map(item => item.song);
      
      // Combine artist songs and genre-similar songs
      let similarSongs = [...artistSongs];
      
      for (const song of genreSimilarSongs) {
        if (!similarSongs.some(s => s.id === song.id)) {
          similarSongs.push(song);
        }
      }
      
      // If we have enough similar songs, return them
      if (similarSongs.length >= 10) {
        return similarSongs;
      }
      
      // Otherwise, continue to add random songs
      const allSongs = Array.from(this.songs.values());
      const shuffled = [...allSongs].sort(() => 0.5 - Math.random());
      
      while (similarSongs.length < 10 && shuffled.length > 0) {
        const nextSong = shuffled.pop();
        if (nextSong && !existingSongIds.has(nextSong.id) && 
            !similarSongs.some(s => s.id === nextSong.id)) {
          similarSongs.push(nextSong);
        }
      }
      
      return similarSongs;
    }
    
    // If we couldn't find genres/moods, just return artist songs + random
    let similarSongs = [...artistSongs];
    
    // Add some random songs if we don't have enough
    if (similarSongs.length < 10) {
      const allSongs = Array.from(this.songs.values());
      const shuffled = [...allSongs].sort(() => 0.5 - Math.random());
      
      while (similarSongs.length < 10 && shuffled.length > 0) {
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
          album: null,
          duration,
          genre: [],
          mood: []
        };
        this.songs.set(id, matchedSong);
      }
      
      suggestedSongs.push(matchedSong);
    }
    
    // 2. Get songs based on context - this is now our primary source after user suggestions
    const contextSongs = this.getRelevantSongsByContext(context);
    
    // 3. Create a set of existing song IDs to avoid duplicates
    const existingSongIds = new Set(suggestedSongs.map(song => song.id));
    
    // 4. Get additional similar songs based on the suggested artists
    const suggestionArtists = suggestions.map(s => s.artist);
    const similarSongs = this.getSimilarSongs(suggestionArtists, existingSongIds);
    
    // 5. Begin with suggested songs
    const playlistSongs: Song[] = [...suggestedSongs];
    
    // 6. Prioritize context-relevant songs
    // We'll use a higher ratio of context songs (60-70%) for better context matching
    const maxContextSongs = 14; // 70% of a 20-song playlist after user suggestions
    const maxSimilarSongs = 20 - maxContextSongs - playlistSongs.length;
    
    // Add context songs first (prioritizing context over artist similarity)
    let contextSongsAdded = 0;
    for (const song of contextSongs) {
      if (contextSongsAdded >= maxContextSongs || playlistSongs.length >= 20) break;
      if (!existingSongIds.has(song.id)) {
        playlistSongs.push(song);
        existingSongIds.add(song.id);
        contextSongsAdded++;
      }
    }
    
    // Add similar songs to fill remaining slots
    let similarSongsAdded = 0;
    for (const song of similarSongs) {
      if (similarSongsAdded >= maxSimilarSongs || playlistSongs.length >= 20) break;
      if (!existingSongIds.has(song.id)) {
        playlistSongs.push(song);
        existingSongIds.add(song.id);
        similarSongsAdded++;
      }
    }
    
    // If we still need more songs, add more context songs
    if (playlistSongs.length < 20) {
      // Get more context songs from later in the list
      for (let i = contextSongsAdded; i < contextSongs.length; i++) {
        if (playlistSongs.length >= 20) break;
        const song = contextSongs[i];
        if (!existingSongIds.has(song.id)) {
          playlistSongs.push(song);
          existingSongIds.add(song.id);
        }
      }
    }
    
    // 7. Arrange songs in a pleasing musical order
    const orderedSongs = this.arrangeInMusicalOrder(playlistSongs);
    
    // 8. Create response object
    const playlistName = generatePlaylistName(context);
    
    return {
      name: playlistName,
      tracks: orderedSongs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album || undefined, // Convert null to undefined to match response type
        duration: song.duration
      }))
    };
  }
}

export const storage = new MemStorage();
