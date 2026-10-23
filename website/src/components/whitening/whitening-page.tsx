import React from "react";
import { WhiteningHero } from "./whitening-hero";
import { WhiteningEvidence } from "./whitening-evidence";
import { WhiteningVisualizer } from "./whitening-visualizer";
import { WhiteningVideo } from "./whitening-video";
import { WhiteningComparison } from "./whitening-comparison";
import { WhiteningProducts } from "./whitening-products";
import { WhiteningAwards } from "./whitening-awards";
import { WhiteningFaq } from "./whitening-faq";
import { WhiteningContact } from "./whitening-contact";

export function WhiteningPage() {
  return (
    <main>
      
      {/* 3. Interactive 8-Shade VITA Bleach Guide Simulator (Part 2 of Variant B synthesis) */}
      <WhiteningVisualizer />

      {/* 4. Doctor-Led Video Consultation & Informed Consent (Part 3 of Variant D synthesis) */}
      <WhiteningVideo />

      {/* 5. 3-Tier System Comparison Matrix (Part 4 of Variant B synthesis) */}
      <WhiteningComparison />

      {/* 6. Detailed Product Specifications (Solid cards, no glass, no italics) */}
      <WhiteningProducts />

      {/* 8. Frequently Asked Questions (Solid accordion & solid CTA) */}
      <WhiteningFaq />
    </main>
  );
}
