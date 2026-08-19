"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const CONDENSE_AT = 72;
const EXPAND_AT = 16;

type ScrollAwareHeaderProps = {
  children: ReactNode;
};

export function ScrollAwareHeader({ children }: ScrollAwareHeaderProps) {
  const [condensed, setCondensed] = useState(false);
  const condensedRef = useRef(false);

  useEffect(() => {
    let animationFrame = 0;

    const update = () => {
      animationFrame = 0;
      const next = condensedRef.current
        ? window.scrollY > EXPAND_AT
        : window.scrollY >= CONDENSE_AT;

      if (next === condensedRef.current) return;
      condensedRef.current = next;
      setCondensed(next);
    };

    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(update);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("pageshow", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("pageshow", scheduleUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <header className="blog-header" data-condensed={condensed ? "true" : "false"}>
      {children}
    </header>
  );
}
