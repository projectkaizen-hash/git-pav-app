import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { MobileDentistryPage } from "@/components/mobile-dentistry/mobile-dentistry-page";

export const Route = createFileRoute("/mobile-dentistry")({
  component: Page,
});

function Page() {
  return (
    <>
      <Header />
      <MobileDentistryPage />
      <Footer />
    </>
  );
}