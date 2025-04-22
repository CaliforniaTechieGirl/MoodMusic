import { usePlaylist } from "@/context/PlaylistContext";
import { Button } from "@/components/ui/button";
import { formatDuration, calculateTotalDuration } from "@/lib/utils";
import { Download, Share, Music } from "lucide-react";
import SpotifyLogo from "./SpotifyLogo";
import { useToast } from "@/hooks/use-toast";

export default function PlaylistResultStep() {
  const { playlistContext, playlistTracks, playlistName, startOver } = usePlaylist();
  const { toast } = useToast();

  const handleDownload = () => {
    // Create a text representation of the playlist
    const playlistText = `${playlistName}\n\n${playlistContext}\n\n` + 
      playlistTracks.map((track, i) => 
        `${i+1}. ${track.title} - ${track.artist}`
      ).join('\n');
    
    // Create a blob and download it
    const blob = new Blob([playlistText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlistName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    // In a real app, this would open a share dialog or copy a link
    // For now, just copy the playlist name to clipboard
    navigator.clipboard.writeText(`Check out my custom playlist: ${playlistName}`);
    toast({
      title: "Copied to clipboard",
      description: "Share link has been copied to your clipboard"
    });
  };
  
  const exportToSpotify = () => {
    // Format the playlist for Spotify search with direct search links
    // This creates a list of songs with Spotify search links that users can click on directly
    const spotifySearchFormat = playlistTracks.map(track => {
      // Format: Song Title - Artist (Spotify search link)
      const searchQuery = encodeURIComponent(`${track.title} ${track.artist}`);
      const spotifySearchUrl = `https://open.spotify.com/search/${searchQuery}`;
      return `${track.title} - ${track.artist} (${spotifySearchUrl})`;
    }).join('\n\n');
    
    // Add header with instructions
    const fullExport = `${playlistName}\n` +
      "Click on the links below to search for each song on Spotify:\n\n" + 
      spotifySearchFormat;
    
    // Copy to clipboard
    navigator.clipboard.writeText(fullExport);
    
    // Show toast notification
    toast({
      title: "Spotify export ready",
      description: "Playlist with Spotify search links copied to clipboard. Paste in a document and click the links to find songs."
    });
  };

  return (
    <>
      <div className="playlist-header bg-gradient-to-b from-gray-800 to-[#191414] p-6">
        <div className="flex flex-col md:flex-row items-center">
          <div className="playlist-cover shadow-lg w-48 h-48 flex-shrink-0 mb-4 md:mb-0 md:mr-6">
            <div className="playlist-card w-full h-full rounded-lg flex items-center justify-center" 
                 style={{ background: 'linear-gradient(145deg, #191414, #252525)' }}>
              <SpotifyLogo className="w-24 h-24 text-[#1DB954]" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="uppercase tracking-widest text-xs text-[#B3B3B3] mb-1">CUSTOM PLAYLIST</p>
            <h2 className="text-2xl md:text-4xl font-bold mb-2">
              {playlistName}
            </h2>
            <p className="text-[#B3B3B3] mb-4">
              {playlistContext}
            </p>
            <div className="text-sm text-[#B3B3B3]">
              <span>{playlistTracks.length} songs</span>
              <span className="mx-2">•</span>
              <span>{calculateTotalDuration(playlistTracks)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="playlist-tracks p-6">
        <div className="playlist-tracks-header flex justify-between text-xs uppercase tracking-wider text-[#B3B3B3] border-b border-gray-800 pb-2 mb-2 font-medium">
          <div className="flex-1"># Title</div>
          <div className="flex-1 text-right md:text-left">Artist</div>
          <div className="hidden md:block w-16 text-right">Time</div>
        </div>
        
        <div className="playlist-tracks-list">
          {playlistTracks.map((track, index) => (
            <div 
              key={track.id} 
              className="playlist-item flex items-center py-3 px-2 rounded group hover:bg-[rgba(255,255,255,0.1)]"
              style={{
                backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
              }}
            >
              <div className="flex-1 flex items-center">
                <span className="mr-4 text-[#B3B3B3] w-4 text-right">{index + 1}</span>
                <div>
                  <div className="font-medium">{track.title}</div>
                  {track.album && (
                    <div className="text-xs text-[#B3B3B3] hidden md:block">Album: {track.album}</div>
                  )}
                </div>
              </div>
              <div className="flex-1 text-right md:text-left text-[#B3B3B3]">{track.artist}</div>
              <div className="hidden md:block w-16 text-right text-[#B3B3B3]">
                {formatDuration(track.duration)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="flex flex-col space-y-4">
          {/* Start Over button */}
          <Button 
            onClick={startOver}
            className="w-full md:w-auto bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-medium transition duration-200 h-auto"
          >
            Start Over
          </Button>
          
          {/* Export buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Spotify Export - Featured Button */}
            <Button
              onClick={exportToSpotify}
              className="w-full px-6 py-3 rounded-full font-medium transition duration-200 flex items-center justify-center h-auto text-white order-first"
              style={{
                background: "linear-gradient(45deg, #1DB954, #1ed760)",
                boxShadow: "0 4px 12px rgba(29, 185, 84, 0.5)"
              }}
            >
              <SpotifyLogo className="w-5 h-5 mr-2" />
              Export to Spotify
            </Button>
            
            {/* Download Button */}
            <Button
              onClick={handleDownload}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-medium transition duration-200 flex items-center justify-center h-auto"
            >
              <Download className="w-5 h-5 mr-2" />
              Download
            </Button>
            
            {/* Share Button */}
            <Button
              onClick={handleShare}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-medium transition duration-200 flex items-center justify-center h-auto"
            >
              <Share className="w-5 h-5 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
