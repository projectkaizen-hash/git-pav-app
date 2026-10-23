import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { RootCanalPage } from "@/components/root-canal/root-canal-page";

export const Route = createFileRoute("/root-canal")({
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-[#fffdf9] text-fg">
      <Header />
      <RootCanalPage />
      <Footer />
    </div>
  );
}
