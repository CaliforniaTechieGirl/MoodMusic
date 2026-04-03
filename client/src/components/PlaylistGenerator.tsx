import { usePlaylist } from "@/context/PlaylistContext";
import StepIndicator from "./StepIndicator";
import ContextStep from "./ContextStep";
import SuggestionsStep from "./SuggestionsStep";
import PlaylistResultStep from "./PlaylistResultStep";

function GeneratingLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <style>{`
        @keyframes noteBounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(-18px); opacity: 1; }
        }
        .note1 { animation: noteBounce 1.1s ease-in-out infinite; animation-delay: 0s; }
        .note2 { animation: noteBounce 1.1s ease-in-out infinite; animation-delay: 0.22s; }
        .note3 { animation: noteBounce 1.1s ease-in-out infinite; animation-delay: 0.44s; }
        .note4 { animation: noteBounce 1.1s ease-in-out infinite; animation-delay: 0.66s; }

        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; }
          40%           { opacity: 1; }
        }
        .dot1 { animation: dotPulse 1.4s ease-in-out infinite; animation-delay: 0s; }
        .dot2 { animation: dotPulse 1.4s ease-in-out infinite; animation-delay: 0.2s; }
        .dot3 { animation: dotPulse 1.4s ease-in-out infinite; animation-delay: 0.4s; }
      `}</style>

      <div className="flex items-end gap-3 mb-8 h-16">
        <span className="note1 text-[#1DB954] text-4xl select-none">♩</span>
        <span className="note2 text-[#1DB954] text-5xl select-none">♪</span>
        <span className="note3 text-[#1DB954] text-4xl select-none">♫</span>
        <span className="note4 text-[#1DB954] text-5xl select-none">♬</span>
      </div>

      <p className="text-white font-semibold text-lg mb-2">Building your playlist</p>
      <p className="text-[#B3B3B3] text-sm flex items-center gap-1">
        Finding the perfect tracks
        <span className="dot1 inline-block">.</span>
        <span className="dot2 inline-block">.</span>
        <span className="dot3 inline-block">.</span>
      </p>
    </div>
  );
}

export default function PlaylistGenerator() {
  const { currentStep, isGenerating } = usePlaylist();

  return (
    <div className="bg-[#191414] rounded-xl shadow-xl overflow-hidden">
      <StepIndicator />

      {isGenerating ? (
        <GeneratingLoader />
      ) : (
        <>
          {currentStep === 1 && <ContextStep />}
          {currentStep === 2 && <SuggestionsStep />}
          {currentStep === 3 && <PlaylistResultStep />}
        </>
      )}
    </div>
  );
}
