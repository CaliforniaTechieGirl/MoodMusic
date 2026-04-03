import { useState } from "react";
import { usePlaylist } from "@/context/PlaylistContext";
import { Button } from "@/components/ui/button";
import { formatDuration, calculateTotalDuration } from "@/lib/utils";
import { Download, Share, Loader2, Music } from "lucide-react";
import { SiSpotify } from "react-icons/si";
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
  
  const [isExporting, setIsExporting] = useState(false);

  const exportToSpotify = async () => {
    setIsExporting(true);
    try {
      // Ask the server to initiate OAuth and return the Spotify auth URL
      const res = await fetch('/api/spotify/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistName,
          tracks: playlistTracks.map(t => ({ title: t.title, artist: t.artist })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to start Spotify export');
      }

      const { authUrl } = await res.json();

      // Open Spotify OAuth in a popup window
      const width = 500, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        'spotify-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site and try again.');
      }

      // Listen for the result message from the popup
      const cleanup = (interval: ReturnType<typeof setInterval>, timeout: ReturnType<typeof setTimeout>) => {
        clearInterval(interval);
        clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
        setIsExporting(false);
      };

      const handleMessage = (event: MessageEvent) => {
        if (typeof event.data !== 'object' || event.data === null) return;
        if (!('success' in event.data)) return;
        const data = event.data;
        cleanup(pollClosed, safetyTimeout);

        if (data.success) {
          toast({
            title: '🎵 Playlist created on Spotify!',
            description: `${data.tracksAdded} tracks added${data.tracksFailed > 0 ? ` (${data.tracksFailed} not found)` : ''}. Opening playlist...`,
          });
          window.open(data.playlistUrl, '_blank');
        } else {
          toast({
            title: 'Spotify export failed',
            description: data.error || 'Something went wrong. Please try again.',
            variant: 'destructive',
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Reset if popup is closed without completing
      const pollClosed = setInterval(() => {
        if (popup.closed) {
          cleanup(pollClosed, safetyTimeout);
        }
      }, 500);

      // Safety net: always reset after 3 minutes
      const safetyTimeout = setTimeout(() => {
        cleanup(pollClosed, safetyTimeout);
      }, 3 * 60 * 1000);

    } catch (err: any) {
      setIsExporting(false);
      toast({
        title: 'Export failed',
        description: err.message || 'Could not export to Spotify.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="playlist-header bg-gradient-to-b from-gray-800 to-[#191414] p-6">
        <div className="flex flex-col md:flex-row items-center">
          <div className="playlist-cover shadow-lg w-48 h-48 flex-shrink-0 mb-4 md:mb-0 md:mr-6">
            <div className="playlist-card w-full h-full rounded-lg flex items-center justify-center" 
                 style={{ background: 'linear-gradient(145deg, #191414, #252525)' }}>
              <div className="w-24 h-24 rounded-full bg-[#1DB954] flex items-center justify-center">
                <Music className="w-12 h-12 text-white" />
              </div>
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
                  {track.url ? (
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-[#1DB954] hover:underline transition-colors"
                    >
                      {track.title}
                    </a>
                  ) : (
                    <div className="font-medium">{track.title}</div>
                  )}
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
              disabled={isExporting}
              className="w-full px-6 py-3 rounded-full font-medium transition duration-200 flex items-center justify-center h-auto text-white order-first disabled:opacity-70"
              style={{
                background: "linear-gradient(45deg, #1DB954, #1ed760)",
                boxShadow: "0 4px 12px rgba(29, 185, 84, 0.5)"
              }}
            >
              {isExporting ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <SiSpotify className="w-5 h-5 mr-2" />
              )}
              {isExporting ? "Connecting to Spotify…" : "Export to Spotify"}
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
