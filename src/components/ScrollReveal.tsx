"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "left" | "right" | "scale";
  threshold?: number;
}

/**
 * Hardware-accelerated scroll reveal component.
 * Uses IntersectionObserver + GPU transform/opacity only,
 * respects `prefers-reduced-motion: reduce`, prevents above-the-fold hydration flash,
 * and never leaves content hidden on SSR.
 */
export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
  threshold = 0.12,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"ssr" | "hidden" | "visible">("ssr");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setPhase("visible");
      return;
    }

    const node = ref.current;
    if (!node) {
      setPhase("visible");
      return;
    }

    // Elements already inside the viewport on initial load stay immediately visible without flash
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      setPhase("visible");
      return;
    }

    setPhase("hidden");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setPhase("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -36px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const hiddenTransform = (() => {
    switch (direction) {
      case "left":
        return "translate3d(-28px, 0, 0)";
      case "right":
        return "translate3d(28px, 0, 0)";
      case "scale":
        return "translate3d(0, 18px, 0) scale(0.96)";
      case "up":
      default:
        return "translate3d(0, 28px, 0)";
    }
  })();

  const isShown = phase === "ssr" || phase === "visible";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isShown ? 1 : 0,
        transform: isShown ? "translate3d(0, 0, 0) scale(1)" : hiddenTransform,
        transition:
          phase === "visible"
            ? `opacity 720ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, transform 720ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`
            : "none",
        willChange: phase === "hidden" ? "transform, opacity" : "auto",
      }}
    >
      {children}
    </div>
  );
}
