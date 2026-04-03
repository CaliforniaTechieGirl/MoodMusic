import { usePlaylist } from "@/context/PlaylistContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { X, Plus } from "lucide-react";

export default function SuggestionsStep() {
  const { 
    songSuggestions, 
    addSongSuggestion, 
    removeSongSuggestion, 
    updateSongSuggestion,
    setCurrentStep,
    generatePlaylist,
    isGenerating,
    startOver
  } = usePlaylist();

  const isPrePopulated = songSuggestions.some(s => s.title.trim() !== '' || s.artist.trim() !== '');
  
  const [errors, setErrors] = useState<{[key: number]: string}>({});

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleCreatePlaylist = async () => {
    // Validate song suggestions
    const newErrors: {[key: number]: string} = {};
    let isValid = true;

    songSuggestions.forEach((song, index) => {
      if (!song.title.trim() || !song.artist.trim()) {
        newErrors[index] = "Please provide both song title and artist name";
        isValid = false;
      }
    });

    if (!isValid) {
      setErrors(newErrors);
      return;
    }

    // Clear errors and generate playlist
    setErrors({});
    await generatePlaylist();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Suggest 2-3 songs you'd like in your playlist</h2>
      <p className="text-[#B3B3B3] mb-6">Tell us some songs that fit your mood or activity</p>
      
      <div className="mb-4">
        {songSuggestions.map((song, index) => (
          <div key={index} className="song-suggestion mb-4 bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Song Suggestion #{index + 1}</h3>
              {songSuggestions.length > 1 && (
                <button 
                  onClick={() => removeSongSuggestion(index)}
                  className="text-[#B3B3B3] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input 
                type="text" 
                placeholder="Song Title" 
                value={song.title}
                onChange={(e) => updateSongSuggestion(index, 'title', e.target.value)}
                className="bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent h-10"
              />
              <Input 
                type="text" 
                placeholder="Artist Name" 
                value={song.artist}
                onChange={(e) => updateSongSuggestion(index, 'artist', e.target.value)}
                className="bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent h-10"
              />
            </div>
            {errors[index] && (
              <p className="mt-2 text-red-500 text-sm">{errors[index]}</p>
            )}
          </div>
        ))}
      </div>
      
      {songSuggestions.length < 3 && (
        <div className="mb-6">
          <button 
            onClick={addSongSuggestion}
            className="text-[#1DB954] hover:text-white flex items-center font-medium transition duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Another Song
          </button>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Button
            onClick={handleBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-medium transition duration-200 h-auto"
          >
            Back
          </Button>
          {isPrePopulated && (
            <Button
              onClick={startOver}
              variant="ghost"
              className="text-[#B3B3B3] hover:text-white px-4 py-3 rounded-full font-medium transition duration-200 h-auto"
            >
              Start Over
            </Button>
          )}
        </div>
        <Button
          onClick={handleCreatePlaylist}
          disabled={isGenerating}
          className="bg-[#1DB954] hover:bg-opacity-80 text-white px-6 py-3 rounded-full font-medium transition duration-200 h-auto disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : "Create Playlist"}
        </Button>
      </div>
    </div>
  );
}
