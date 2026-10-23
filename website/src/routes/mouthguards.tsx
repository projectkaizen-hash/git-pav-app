import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { MouthguardsPage } from "@/components/mouthguards/mouthguards-page";

export const Route = createFileRoute("/mouthguards")({
  component: Page,
});

function Page() {
  return (
    <>
      <Header />
      <MouthguardsPage />
      <Footer />
    </>
  );
}