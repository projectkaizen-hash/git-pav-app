import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { ScrollProgress } from "@/components/home/scroll-progress";
import { CartPage } from "@/components/shop/cart-page";

export const Route = createFileRoute("/cart")({ component: CartRoute });

function CartRoute() {
  return (
    <main className="min-h-screen bg-[#fffdf9] text-fg">
      <ScrollProgress />
      <Header />
      <CartPage />
      <Footer />
    </main>
  );
}

