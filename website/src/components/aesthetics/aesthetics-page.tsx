import { AestheticsHero } from "./aesthetics-hero";
import { AestheticsTreatments } from "./aesthetics-treatments";
import { AestheticsPremium } from "./aesthetics-premium";
import { AestheticsValues } from "./aesthetics-values";
import { AestheticsPricing } from "./aesthetics-pricing";
import { AestheticsTestimonials } from "./aesthetics-testimonials";
import { AestheticsFaq } from "./aesthetics-faq";
import { AestheticsSafetyBanner } from "./aesthetics-safety-banner";
import { AestheticsSafety } from "./aesthetics-safety";

export function AestheticsPage() {
  return (
    <main className="bg-[#fffdf9]">
      <AestheticsHero />
      <AestheticsTreatments />
      <AestheticsPremium />
      <AestheticsValues />
      <AestheticsPricing />
      <AestheticsTestimonials />
      <AestheticsSafetyBanner />
      <AestheticsFaq />
    </main>
  );
}
