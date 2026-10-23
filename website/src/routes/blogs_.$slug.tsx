import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { ScrollProgress } from "@/components/home/scroll-progress";
import { BlogDetail } from "@/components/blog/blog-detail";

export const Route = createFileRoute("/blogs_/$slug")({
  component: BlogDetailRoute,
});

function BlogDetailRoute() {
  const { slug } = Route.useParams();

  return (
    <main className="min-h-screen bg-[#fffdf9] text-fg">
      <ScrollProgress />
      <Header />
      <div className="pt-16">
        <BlogDetail slug={slug} />
      </div>
      <Footer />
    </main>
  );
}

