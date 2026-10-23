import { useState } from "react";
import { INITIAL_SIGNATURES, CURRENT_SIGNATURES_BASE, PETITION_GOAL, Signature } from "./petition-data";
import { PetitionHero } from "./petition-hero";
import { PetitionFormBar } from "./petition-form-bar";
import { PetitionMedia } from "./petition-media";
import { PetitionSignatures } from "./petition-signatures";
import { PetitionContact } from "./petition-contact";
import { PetitionShareModal } from "./petition-share-modal";

export function PetitionPage() {
  const [signatures, setSignatures] = useState<Signature[]>(INITIAL_SIGNATURES);
  const [totalSignatures, setTotalSignatures] = useState<number>(CURRENT_SIGNATURES_BASE);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleScrollToSign = () => {
    const el = document.getElementById("sign-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSign = (data: { name: string; email: string; postcode: string }) => {
    const newSignature: Signature = {
      id: `sig-${Date.now()}`,
      name: data.name,
      location: data.postcode ? `Bradford ${data.postcode}` : "Bradford resident",
      date: "Just now",
      timestamp: Date.now(),
    };

    setSignatures((prev) => [newSignature, ...prev]);
    setTotalSignatures((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white text-fg">
      {/* 1. Hero Section */}
      <PetitionHero
        onScrollToSign={handleScrollToSign}
        onOpenShare={() => setShareModalOpen(true)}
      />

      {/* 2. Form Banner */}
      <PetitionFormBar
        currentSignatures={totalSignatures}
        goal={PETITION_GOAL}
        onSign={handleSign}
      />

      {/* 3. Media Coverage */}
      <PetitionMedia />

      {/* 4. Live Signatures Table */}
      <PetitionSignatures
        signatures={signatures}
        totalCount={totalSignatures}
      />

      {/* 5. Get In Touch Form */}
      <PetitionContact />

      {/* Share Modal Dialog */}
      <PetitionShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}

