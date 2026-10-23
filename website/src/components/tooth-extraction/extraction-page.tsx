import { ExtractionHero } from "./extraction-hero";
import { ExtractionGuarantee } from "./extraction-guarantee";
import { ExtractionPricing } from "./extraction-pricing";
import { ExtractionVideo } from "./extraction-video";
import { ExtractionPostOp } from "./extraction-postop";
import { ExtractionBook } from "./extraction-book";
import { ExtractionFaq } from "./extraction-faq";
import { ExtractionContact } from "./extraction-contact";

export function ToothExtractionPage() {
  return (
    <main>
      <ExtractionHero />
      <ExtractionGuarantee />
      <ExtractionPricing />
      <ExtractionVideo />
      <ExtractionPostOp />
      <ExtractionBook />
      <ExtractionFaq />
    </main>
  );
}
