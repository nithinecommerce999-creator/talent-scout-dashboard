import { useState, useEffect, useRef } from "react";

export function useCountUp(end: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const prevEnd = useRef(0);

  useEffect(() => {
    if (end === prevEnd.current) return;
    const start = prevEnd.current;
    prevEnd.current = end;
    const diff = end - start;
    if (diff === 0) return;

    const startTime = performance.now();
    let raf: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return count;
}
