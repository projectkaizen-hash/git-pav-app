import { useState } from "react";
import { X, Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PetitionShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PetitionShareModal({ isOpen, onClose }: PetitionShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const petitionUrl = typeof window !== "undefined" ? window.location.href : "https://pavdental.com/petition";
  const shareText = "Support fair NHS Dental Funding for Bradford families. Sign the petition now:";

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText} ${petitionUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-slate-100 text-muted hover:bg-slate-200 hover:text-fg"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#faf6f0] text-primary border border-primary/20">
            <Share2 className="size-5" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-fg">Share the Petition</h3>
            <p className="text-xs text-muted">Help us spread the word across Bradford</p>
          </div>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-muted leading-relaxed">
          Sharing takes 10 seconds and helps us reach our 5,000-signature milestone to present in parliament.
        </p>

        {/* Social Share Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {/* WhatsApp */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${petitionUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white py-2.5 px-4 text-xs font-semibold hover:opacity-95 transition-opacity"
          >
            <span>WhatsApp</span>
          </a>

          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(petitionUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] text-white py-2.5 px-4 text-xs font-semibold hover:opacity-95 transition-opacity"
          >
            <span>Facebook</span>
          </a>

          {/* X / Twitter */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(petitionUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-black text-white py-2.5 px-4 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <span>X (Twitter)</span>
          </a>

          {/* Email */}
          <a
            href={`mailto:?subject=${encodeURIComponent("Sign the NHS Dental Funding Petition for Bradford")}&body=${encodeURIComponent(`${shareText}\n\n${petitionUrl}`)}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#844d1e] text-white py-2.5 px-4 text-xs font-semibold hover:opacity-95 transition-opacity"
          >
            <span>Email</span>
          </a>
        </div>

        {/* Copy Link Input */}
        <div className="mt-5">
          <label className="block text-[11px] font-semibold text-fg/80 mb-1.5 uppercase tracking-wider">
            Or Copy Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={petitionUrl}
              className="w-full rounded-xl border border-border/70 bg-[#faf8f5] px-3.5 py-2 text-xs text-muted truncate select-all focus:outline-none"
            />
            <Button
              type="button"
              onClick={handleCopy}
              size="sm"
              className="accent-gradient text-white text-xs px-3.5 shrink-0 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-fg font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

