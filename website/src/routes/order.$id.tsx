import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { ScrollProgress } from "@/components/home/scroll-progress";
import { OrderConfirmation } from "@/components/shop/order-confirmation";

export const Route = createFileRoute("/order/$id")({
  component: OrderRoute,
});

function OrderRoute() {
  const { id } = Route.useParams();

  return (
    <main className="min-h-screen bg-[#fffdf9] text-fg">
      <ScrollProgress />
      <Header />
      <OrderConfirmation orderId={id} />
      <Footer />
    </main>
  );
}

