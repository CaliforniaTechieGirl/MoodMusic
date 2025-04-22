import { usePlaylist } from "@/context/PlaylistContext";
import { cn } from "@/lib/utils";

export default function StepIndicator() {
  const { currentStep } = usePlaylist();

  return (
    <div className="flex border-b border-gray-800">
      <div 
        className={cn(
          "flex-1 py-4 text-center font-medium transition-colors",
          currentStep >= 1 
            ? "text-[#1DB954]" 
            : "text-[#B3B3B3]",
          currentStep === 1 && "border-b-2 border-[#1DB954]"
        )}
      >
        Context
      </div>
      <div 
        className={cn(
          "flex-1 py-4 text-center font-medium transition-colors",
          currentStep >= 2 
            ? "text-[#1DB954]" 
            : "text-[#B3B3B3]",
          currentStep === 2 && "border-b-2 border-[#1DB954]"
        )}
      >
        Song Suggestions
      </div>
      <div 
        className={cn(
          "flex-1 py-4 text-center font-medium transition-colors",
          currentStep >= 3 
            ? "text-[#1DB954]" 
            : "text-[#B3B3B3]",
          currentStep === 3 && "border-b-2 border-[#1DB954]"
        )}
      >
        Your Playlist
      </div>
    </div>
  );
}
