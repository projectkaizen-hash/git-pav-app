import { Button } from "@/components/ui/button";

export interface CtaProps {
  ctaEnabled: boolean;
  text: string;
  link: string;
  variant?: "default" | "link";
}

export function Cta({ cta, cta: { text, link, variant = "default" } }: { cta: CtaProps }) {
  if (!cta.ctaEnabled) return null;

  if (variant === "link") {
    return (
      <a href={link} className="text-sm font-medium text-primary hover:underline">
        {text}
      </a>
    );
  }

  return (
    <Button asChild>
      <a href={link}>{text}</a>
    </Button>
  );
}
