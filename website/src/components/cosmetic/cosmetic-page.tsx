import { CosmeticHero } from "./cosmetic-hero";
import { CosmeticAbout } from "./cosmetic-about";
import { CosmeticProcedures } from "./cosmetic-procedures";
import { CosmeticBenefits } from "./cosmetic-benefits";
import { CosmeticFinancing } from "./cosmetic-financing";
import { CosmeticShowcase } from "./cosmetic-showcase";
import { CosmeticFaq } from "./cosmetic-faq";
import { CosmeticContact } from "./cosmetic-contact";

export function CosmeticPage() {
  return (
    <main className="bg-[#fffdf9]">
      <CosmeticHero />
      <CosmeticAbout />
      <CosmeticProcedures />
      <CosmeticBenefits />
      <CosmeticFinancing />
      <CosmeticShowcase />
      <CosmeticFaq />
    </main>
  );
}
