import { GrillzHero } from "./grillz-hero";
import { GrillzStyles } from "./grillz-styles";
import { GrillzPricing } from "./grillz-pricing";
import { GrillzProcess } from "./grillz-process";
import { GrillzFaq } from "./grillz-faq";

export function CustomGrillzPage() {
  return (
    <main className="bg-[#fffdf9]">
      <GrillzHero />
      <GrillzStyles />
      <GrillzPricing />
      <GrillzProcess />
      <GrillzFaq />
    </main>
  );
}
