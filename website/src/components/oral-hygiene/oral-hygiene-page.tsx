import { OralHygieneHero } from "./oral-hygiene-hero";
import { OralHygieneImportance } from "./oral-hygiene-importance";
import { OralHygieneWhoNeeds } from "./oral-hygiene-who-needs";
import { OralHygienePricing } from "./oral-hygiene-pricing";
import { OralHygieneShowcase } from "./oral-hygiene-showcase";
import { OralHygieneFaq } from "./oral-hygiene-faq";
import { OralHygieneConsent } from "./oral-hygiene-consent";

export function OralHygienePage() {
  return (
    <main className="bg-[#fffdf9]">
      <OralHygieneHero />
      <OralHygieneImportance />
      <OralHygienePricing />
      <OralHygieneShowcase />
      <OralHygieneWhoNeeds />
      <OralHygieneConsent />
      <OralHygieneFaq />
    </main>
  );
}