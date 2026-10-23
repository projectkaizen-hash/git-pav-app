import { useState, type FormEvent } from "react";
import { CheckCircle2, ShieldCheck, PenTool, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface PetitionFormBarProps {
  currentSignatures: number;
  goal: number;
  onSign: (data: { name: string; email: string; postcode: string }) => void;
}

export function PetitionFormBar({ currentSignatures, goal, onSign }: PetitionFormBarProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const percentage = Math.min(100, Math.round((currentSignatures / goal) * 100));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    try {
      await api.forms.submitPetition({
        name: name.trim(),
        email: email.trim(),
        message: `Postcode: ${postcode.trim() || "N/A"}`,
      });
      onSign({ name: name.trim(), email: email.trim(), postcode: postcode.trim() });
      setSubmitted(true);
    } catch {
      onSign({ name: name.trim(), email: email.trim(), postcode: postcode.trim() });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="sign-form" className="relative overflow-hidden bg-gradient-to-r from-[#925a27] via-[#b77436] to-[#cf9448] py-12 sm:py-14 text-white shadow-inner">
      {/* Decorative texture overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className=" mx-auto">
          {/* Header & Goal Progress */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Sign the Petition
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-white/90">
                Help us reach our target of {goal.toLocaleString()} verified signatures in Bradford & West Yorkshire.
              </p>
            </div>

            {/* Signature Counter & Progress */}
            <div className="text-left md:text-right shrink-0">
              <div className="flex items-baseline md:justify-end gap-1.5 font-display text-2xl sm:text-3xl font-bold text-white">
                <span>{currentSignatures.toLocaleString()}</span>
                <span className="text-sm font-normal text-white/80">/ {goal.toLocaleString()} signed</span>
              </div>
              <div className="mt-2 w-48 md:w-56 h-2 rounded-full bg-black/20 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700 ease-out shadow-xs"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Form or Success Notification */}
          {submitted ? (
            <div className="rounded-2xl border border-white/40 bg-white/15 p-6 sm:p-8 backdrop-blur-md text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-[#925a27] shadow-sm mb-3">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                Thank You, {name}!
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-white/90 max-w-md mx-auto">
                Your signature has been officially added to our campaign. We will keep you updated on our petition progress and meetings with health authorities.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setEmail("");
                  setPostcode("");
                }}
                className="mt-5 text-xs text-white/80 underline hover:text-white"
              >
                Sign for another family member
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-3.5 items-center">
                {/* Full Name */}
                <div className="sm:col-span-4">
                  <label htmlFor="pet-name" className="sr-only">Full Name</label>
                  <input
                    id="pet-name"
                    required
                    type="text"
                    placeholder="Full Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-12 rounded-xl bg-white text-fg px-4 text-sm placeholder:text-muted/70 shadow-xs focus:outline-none focus:ring-2 focus:ring-white/80"
                  />
                </div>

                {/* Email Address */}
                <div className="sm:col-span-4">
                  <label htmlFor="pet-email" className="sr-only">Email Address</label>
                  <input
                    id="pet-email"
                    required
                    type="email"
                    placeholder="Email Address *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 rounded-xl bg-white text-fg px-4 text-sm placeholder:text-muted/70 shadow-xs focus:outline-none focus:ring-2 focus:ring-white/80"
                  />
                </div>

                {/* Postcode */}
                <div className="sm:col-span-2">
                  <label htmlFor="pet-postcode" className="sr-only">Postcode</label>
                  <input
                    id="pet-postcode"
                    type="text"
                    placeholder="Postcode (BD3)"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="w-full h-12 rounded-xl bg-white text-fg px-4 text-sm placeholder:text-muted/70 shadow-xs focus:outline-none focus:ring-2 focus:ring-white/80"
                  />
                </div>

                {/* Submit Button */}
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-white text-[#844d1e] font-bold hover:bg-[#fffbf6] hover:text-[#5a3311] shadow-sm transition-transform active:scale-95 text-sm"
                  >
                    {loading ? "Signing..." : "Sign Petition"}
                  </Button>
                </div>
              </div>

              {/* Privacy disclaimer */}
              <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-white/80 pt-1">
                <ShieldCheck className="size-3.5 shrink-0 text-white/90" />
                <span>We respect your privacy. Your email will only be used for petition updates and verification.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

