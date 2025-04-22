import PlaylistGenerator from "@/components/PlaylistGenerator";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <SpotifyLogo className="w-12 h-12 text-[#1DB954]" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Custom Playlist Generator</h1>
          <p className="text-[#B3B3B3]">Create a personalized playlist tailored to your mood and preferences</p>
        </header>
        
        <PlaylistGenerator />
      </div>
    </div>
  );
}

function SpotifyLogo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-0.83-5.56c-2.76 0-5.27-0.82-7.18-2.09l1.03-1.26c1.5 1.02 3.57 1.65 5.83 1.65 1.31 0 2.68-0.21 3.85-0.65l0.65 1.46c-1.31 0.58-2.85 0.89-4.18 0.89zm0.55-4.01c-2 0-3.53-0.58-4.91-1.32l0.97-1.04c1.14 0.61 2.5 1.05 4.01 1.05 1.19 0 2.3-0.23 3.38-0.63l0.52 1.15c-1.23 0.49-2.49 0.79-3.97 0.79zm0.24-3.73c-1.59 0-2.5-0.33-3.67-0.8l0.6-0.72c0.88 0.35 1.63 0.62 3.07 0.62 0.92 0 1.84-0.15 2.74-0.39l0.33 0.77c-1 0.33-2.01 0.52-3.07 0.52z"/>
    </svg>
  );
}
