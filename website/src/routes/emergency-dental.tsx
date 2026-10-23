import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { EmergencyDentalPage } from "@/components/emergency-dental/emergency-page";

export const Route = createFileRoute("/emergency-dental")({
  component: Page,
});

function Page() {
  return (
    <>
      <Header />
      <div className="pt-16">
        <EmergencyDentalPage />
      </div>
      <Footer />
    </>
  );
}
