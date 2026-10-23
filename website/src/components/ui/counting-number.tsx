import { useEffect, useState } from "react";

export function CountingNumber({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(target * easeOutQuart));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [target]);

  return <span>{count}</span>;
}
