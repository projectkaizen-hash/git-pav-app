import { useState, useMemo } from "react";
import { ARTICLES, type Article } from "./blog-data";
import { BlogHero } from "./blog-hero";
import { FeaturedArticle } from "./featured-article";
import { BlogGrid } from "./blog-grid";
import { NewsletterCta } from "./newsletter-cta";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: apiBlogs } = useQuery({
    queryKey: ["blogs"],
    queryFn: () => api.blogs.list(),
  });

  const activeArticles: Article[] = useMemo(() => {
    if (apiBlogs && apiBlogs.length > 0) {
      return apiBlogs.map((b, idx) => {
        const matched = ARTICLES.find((a) => a.slug === b.slug);
        return {
          id: b.id,
          slug: b.slug,
          title: b.title,
          category: (b.category?.toLowerCase() as Article["category"]) || "hygiene",
          categoryLabel: b.category || "Oral Health",
          author: {
            name: b.author || "Dr. Hassan Bhojani",
            role: "Dental Care Team",
            avatar:
              "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=85",
          },
          date: b.published_at
            ? new Date(b.published_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Recent",
          readingTime: matched?.readingTime || "4 min read",
          image:
            b.cover_image_url ||
            matched?.image ||
            "https://images.ctfassets.net/kygl0mrej7ni/5O9q1iObkIWOW6e2gW2gOe/73bcbc7688328ee63b4fa66973d9cd97/24_hour_emergency.png",
          excerpt: b.excerpt || matched?.excerpt || "",
          featured: idx === 0,
          content: matched?.content || {
            intro: b.excerpt || b.title,
            sections: [
              {
                heading: "Clinical Insights",
                body: b.body || "Detailed guidance on this procedure will be provided by our clinical staff.",
              },
            ],
            takeaways: ["Routine check-ups prevent tooth decay", "Consult your dentist before beginning treatment"],
          },
        };
      });
    }
    return ARTICLES;
  }, [apiBlogs]);

  const filteredArticles = useMemo(() => {
    return activeArticles.filter((art) => {
      const matchesCat = selectedCategory === "all" || art.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.author.name.toLowerCase().includes(q) ||
        art.categoryLabel.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [activeArticles, selectedCategory, searchQuery]);

  const featuredArticle = activeArticles.find((a) => a.featured) || activeArticles[0] || null;
  const showFeatured = selectedCategory === "all" && !searchQuery.trim() && activeArticles.length > 0 && featuredArticle;

  // If showing featured separately, filter it out from main grid so it's not duplicated
  const gridArticles = showFeatured
    ? filteredArticles.filter((a) => a.id !== featuredArticle.id)
    : filteredArticles;

  return (
    <div className="min-h-screen bg-[#fffdf9] text-fg">
      {/* 1. Hero with Search & Filter Pills */}
      <BlogHero
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalArticles={filteredArticles.length}
      />

      {/* 2. Featured Article Spotlight (when in 'all' view with no search) */}
      {showFeatured && (
        <FeaturedArticle
          article={featuredArticle}
        />
      )}

      {/* 3. Article Grid */}
      <BlogGrid
        articles={gridArticles}
        totalArticles={activeArticles.length}
        onResetFilter={() => {
          setSelectedCategory("all");
          setSearchQuery("");
        }}
      />

      {/* 4. Newsletter Subscription */}
      <NewsletterCta />
    </div>
  );
}
