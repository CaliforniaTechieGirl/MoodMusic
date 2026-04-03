import PlaylistGenerator from "@/components/PlaylistGenerator";
import { Music } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">MoodMusic Playlist Maker</h1>
          <p className="text-[#B3B3B3]">Create a personalized playlist tailored to your mood and preferences</p>
        </header>
        
        <PlaylistGenerator />
      </div>
    </div>
  );
}
