import { usePlaylist } from "@/context/PlaylistContext";
import StepIndicator from "./StepIndicator";
import ContextStep from "./ContextStep";
import SuggestionsStep from "./SuggestionsStep";
import PlaylistResultStep from "./PlaylistResultStep";

export default function PlaylistGenerator() {
  const { currentStep } = usePlaylist();

  return (
    <div className="bg-[#191414] rounded-xl shadow-xl overflow-hidden">
      <StepIndicator />
      
      {currentStep === 1 && <ContextStep />}
      {currentStep === 2 && <SuggestionsStep />}
      {currentStep === 3 && <PlaylistResultStep />}
    </div>
  );
}
