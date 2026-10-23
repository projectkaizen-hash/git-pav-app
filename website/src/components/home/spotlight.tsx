import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** 21st.dev Spotlight — mouse-tracked radial light. */
export function Spotlight({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const onMove = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      el.style.setProperty("--sx", `${e.clientX - r.left}px`);
      el.style.setProperty("--sy", `${e.clientY - r.top}px`);
    };
    parent.addEventListener("pointermove", onMove);
    return () => parent.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{
        background:
          "radial-gradient(420px circle at var(--sx, 70%) var(--sy, 30%), color-mix(in oklab, var(--color-primary) 18%, transparent), transparent 55%)",
      }}
    />
  );
}
