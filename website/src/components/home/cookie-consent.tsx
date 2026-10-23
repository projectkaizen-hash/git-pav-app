import { useState, useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem("cookie_consent", "accepted");
    setShow(false);
    // Dispatch custom event if analytics listener exists
    window.dispatchEvent(new Event("cookie_consent_accepted"));
  }

  function handleDecline() {
    localStorage.setItem("cookie_consent", "declined");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5">
      <div className="rounded-2xl border border-border bg-white/95 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-fg">Cookie & Privacy Preferences</h4>
            <p className="text-xs text-muted leading-relaxed">
              We use analytics cookies to understand website visitor engagement and ensure optimal dental care service.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={handleDecline} className="text-xs h-8">
            Decline
          </Button>
          <Button size="sm" onClick={handleAccept} className="text-xs h-8 bg-primary text-white">
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}

