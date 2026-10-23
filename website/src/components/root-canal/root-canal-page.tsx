import { RootCanalHero } from "./root-canal-hero";
import { RootCanalHow } from "./root-canal-how";
import { RootCanalPricing } from "./root-canal-pricing";
import { RootCanalConsent } from "./root-canal-consent";
import { RootCanalFaq } from "./root-canal-faq";
import { RootCanalContact } from "./root-canal-contact";

export function RootCanalPage() {
  return (
    <main className="bg-[#fffdf9]">
      <RootCanalHero />
      <RootCanalHow />
      <RootCanalPricing />
      <RootCanalConsent />
      <RootCanalFaq />
    </main>
  );
}
