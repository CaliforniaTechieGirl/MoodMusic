import { usePlaylist } from "@/context/PlaylistContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function ContextStep() {
  const { playlistContext, setPlaylistContext, setCurrentStep } = usePlaylist();
  const [error, setError] = useState<string>("");

  const handleNext = () => {
    if (!playlistContext.trim()) {
      setError("Please describe when you will listen to this playlist");
      return;
    }
    setError("");
    setCurrentStep(2);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">When will you listen to this playlist?</h2>
      <p className="text-[#B3B3B3] mb-6">
        Describe the activity or mood (e.g., "when I'm running", "for a romantic dinner")
      </p>
      
      <div className="mb-6">
        <Textarea
          value={playlistContext}
          onChange={(e) => setPlaylistContext(e.target.value)}
          placeholder="I'll listen to this playlist when..."
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent placeholder:text-[#B3B3B3] placeholder:opacity-70"
        />
        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          className="bg-[#1DB954] hover:bg-opacity-80 text-white px-6 py-3 rounded-full font-medium transition duration-200 h-auto"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
