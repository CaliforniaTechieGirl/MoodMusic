import React, { createContext, useContext, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { generatePlaylistName } from '@/lib/utils';

export type SongSuggestion = {
  id?: number;
  title: string;
  artist: string;
};

export type PlaylistTrack = {
  id: number;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  url?: string;
};

export type PlaylistWarning = {
  inputTitle: string;
  inputArtist: string;
  message: string;
  suggestion?: { title: string; artist: string };
};

type PlaylistContextType = {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  playlistContext: string;
  setPlaylistContext: (context: string) => void;
  songSuggestions: SongSuggestion[];
  setSongSuggestions: (songs: SongSuggestion[]) => void;
  addSongSuggestion: () => void;
  removeSongSuggestion: (index: number) => void;
  updateSongSuggestion: (index: number, field: 'title' | 'artist', value: string) => void;
  playlistTracks: PlaylistTrack[];
  removeTrack: (id: number) => void;
  playlistName: string;
  setPlaylistName: (name: string) => void;
  playlistWarnings: PlaylistWarning[];
  isGenerating: boolean;
  generatePlaylist: () => Promise<void>;
  startOver: () => void;
};

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const PlaylistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [playlistContext, setPlaylistContext] = useState<string>('');
  const [songSuggestions, setSongSuggestions] = useState<SongSuggestion[]>([
    { title: '', artist: '' }
  ]);
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [playlistName, setPlaylistName] = useState<string>('');
  const [playlistWarnings, setPlaylistWarnings] = useState<PlaylistWarning[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const addSongSuggestion = () => {
    if (songSuggestions.length < 3) {
      setSongSuggestions([...songSuggestions, { title: '', artist: '' }]);
    }
  };

  const removeSongSuggestion = (index: number) => {
    if (songSuggestions.length > 1) {
      const newSuggestions = [...songSuggestions];
      newSuggestions.splice(index, 1);
      setSongSuggestions(newSuggestions);
    }
  };

  const updateSongSuggestion = (index: number, field: 'title' | 'artist', value: string) => {
    const newSuggestions = [...songSuggestions];
    newSuggestions[index] = { ...newSuggestions[index], [field]: value };
    setSongSuggestions(newSuggestions);
  };

  const removeTrack = (id: number) => {
    setPlaylistTracks(prev => prev.filter(t => t.id !== id));
  };

  const generatePlaylist = async () => {
    setIsGenerating(true);
    try {
      // Filter out empty suggestions
      const validSuggestions = songSuggestions.filter(
        song => song.title.trim() !== '' && song.artist.trim() !== ''
      );
      
      // Make API request to generate playlist
      const response = await apiRequest('POST', '/api/playlist/generate', {
        context: playlistContext,
        suggestions: validSuggestions
      });
      
      const data = await response.json();
      setPlaylistTracks(data.tracks);
      setPlaylistName(data.name || generatePlaylistName(playlistContext));
      setPlaylistWarnings(data.warnings ?? []);
      setCurrentStep(3);
    } catch (error) {
      console.error("Failed to generate playlist:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const startOver = () => {
    setCurrentStep(1);
    setPlaylistContext('');
    setSongSuggestions([{ title: '', artist: '' }]);
    setPlaylistTracks([]);
    setPlaylistName('');
    setPlaylistWarnings([]);
  };

  return (
    <PlaylistContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        playlistContext,
        setPlaylistContext,
        songSuggestions,
        setSongSuggestions,
        addSongSuggestion,
        removeSongSuggestion,
        updateSongSuggestion,
        playlistTracks,
        removeTrack,
        playlistName,
        setPlaylistName,
        playlistWarnings,
        isGenerating,
        generatePlaylist,
        startOver
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = (): PlaylistContextType => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};
