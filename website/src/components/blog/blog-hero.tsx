import { BookOpen, Search } from "lucide-react"
import { Spotlight } from "@/components/home/spotlight"

interface BlogHeroProps {
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  totalArticles: number
}

export function BlogHero({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  totalArticles,
}: BlogHeroProps) {
  const categories = [
    { id: "all", label: "All Articles" },
    { id: "cosmetic", label: "Cosmetic & Aesthetics" },
    { id: "hygiene", label: "Oral Health & Hygiene" },
    { id: "implants", label: "Dental Implants" },
    { id: "community", label: "Community & NHS News" },
  ]

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-[#2a1c12] border-b border-[#e2d4c0] h-[70vh] min-h-[400px]"
      aria-label="PavDental clinical journal"
    >
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/media/hero-clinic.jpg"
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a1c12] via-[#2a1c12]/95 to-[#2a1c12]/80" />
      </div>

      <Spotlight />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center h-full flex flex-col justify-center">
        

        <h1 className="max-w-3xl mx-auto font-display text-3xl sm:text-5xl font-bold text-white leading-tight">
          Dental Insights & <span className="text-[#d4a574]">Clinical Guides</span>
        </h1>
        

        <div className="mt-8 min-w-2xl mx-auto relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-white/60" />
          <input
            type="text"
            placeholder="Search articles by title, topic, or treatment..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#e2d4c0]/30 bg-white/10 pl-10 pr-4 text-xs sm:text-sm text-white placeholder:text-white/50 focus:border-[#d4a574] focus:outline-none focus:ring-1 focus:ring-[#d4a574]/30 shadow-xs"
          />
        </div>

        <div className="mt-4 max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                selectedCategory === cat.id
                  ? "bg-[#d4a574] text-white shadow-xs scale-105"
                  : "bg-white/10 text-white/90 border border-[#e2d4c0]/30 hover:border-[#d4a574] hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

       
      </div>
    </section>
  )
}
