import { useState, useMemo } from "react";
import { Search, UserCheck, CheckCircle2, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { Signature } from "./petition-data";

interface PetitionSignaturesProps {
  signatures: Signature[];
  totalCount: number;
}

const ITEMS_PER_PAGE = 15;

export function PetitionSignatures({ signatures, totalCount }: PetitionSignaturesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSignatures = useMemo(() => {
    if (!searchTerm.trim()) return signatures;
    const term = searchTerm.toLowerCase();
    return signatures.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.location && s.location.toLowerCase().includes(term)),
    );
  }, [signatures, searchTerm]);

  const totalPages = Math.ceil(filteredSignatures.length / ITEMS_PER_PAGE) || 1;
  const paginatedSignatures = filteredSignatures.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <section id="signatures" className="py-16 sm:py-24 bg-[#faf8f5]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#844d1e] tracking-tight">
            Petition Signatures ({totalCount.toLocaleString()})
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted">
            Recent verified signatures from Bradford residents and supporters across the UK
          </p>
        </div>

        {/* Filter and search bar */}
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search supporter by name or postcode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-xl border border-border/70 bg-white pl-10 pr-4 text-xs sm:text-sm placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Shield className="size-3.5 text-emerald-600" />
            <span>GDPR verified & anti-spam protected</span>
          </div>
        </div>

        {/* ── SIGNATURES TABLE ── */}
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#f5eee6] border-b border-border/60 text-xs font-semibold text-[#844d1e] uppercase tracking-wider">
                  <th className="py-3.5 px-6">Full Name</th>
                  <th className="py-3.5 px-6 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedSignatures.length > 0 ? (
                  paginatedSignatures.map((sig, idx) => (
                    <tr
                      key={sig.id || idx}
                      className="transition-colors hover:bg-[#faf6f0]/70 group"
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#fbf5ed] text-[#844d1e] group-hover:bg-[#844d1e] group-hover:text-white transition-colors text-xs font-semibold">
                            {sig.name.charAt(0)}
                          </span>
                          <div>
                            <span className="font-medium text-fg block text-sm">
                              {sig.name}
                            </span>
                            {sig.location && (
                              <span className="text-[11px] text-muted block">
                                {sig.location}
                              </span>
                            )}
                          </div>
                          <span title="Verified Signature" className="inline-flex shrink-0 ml-1">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-right text-xs text-muted whitespace-nowrap">
                        {sig.date}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-sm text-muted">
                      No matching signatures found for "{searchTerm}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 bg-[#fdfcfb] px-6 py-3 text-xs text-muted">
              <span>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSignatures.length)} of{" "}
                {filteredSignatures.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-white text-fg disabled:opacity-40 hover:bg-[#faf6f0]"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-2 font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-white text-fg disabled:opacity-40 hover:bg-[#faf6f0]"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

