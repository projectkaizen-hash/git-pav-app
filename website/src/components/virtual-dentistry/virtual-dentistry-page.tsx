import { VirtualDentistryHero } from "./virtual-dentistry-hero";
import { VirtualDentistryPrescriptionProcess } from "./virtual-dentistry-prescription-process";
import { VirtualDentistryHowItWorks } from "./virtual-dentistry-how-it-works";
import { VirtualDentistryBenefits } from "./virtual-dentistry-benefits";
import { VirtualDentistryFaq } from "./virtual-dentistry-faq";
import { VirtualDentistryRegistration } from "./virtual-dentistry-registration";
import { VirtualDentistryServices } from "./virtual-dentistry-services";

export function VirtualDentistryPage() {
  return (
    <main className="bg-[#fffdf9]">
      <VirtualDentistryHero />
      <VirtualDentistryPrescriptionProcess />
      <VirtualDentistryHowItWorks />
      <VirtualDentistryBenefits />
      <VirtualDentistryFaq />
      <VirtualDentistryRegistration />
      <VirtualDentistryServices />
    </main>
  );
}